import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiUserAdd, HiX, HiOfficeBuilding, HiCheck } from "react-icons/hi";
import toast from "react-hot-toast";

// 🚀 IMPORTACIONES
import { useAuth } from "../../context/AuthContext";
import { solicitudesApi } from "../../api/solicitudes"; 
import { useClienteForm } from "../../hooks/clientes/useClienteForm";

const ClienteCreateModal = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  
  // 🛡️ Rol de Admin (Sincronizado con AuthContext)
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  const { formData, handleChange, handleSubmit, loading } = useClienteForm({
    onClose,
    onSuccess, 
  });

  const [oficinas, setOficinas] = useState([]);
  const [loadingOficinas, setLoadingOficinas] = useState(false);

  // 🏢 Carga de sucursales reales (Solo para ADMIN)
  useEffect(() => {
    if (isOpen && isWebAdmin) {
      const fetchOfis = async () => {
        setLoadingOficinas(true);
        try {
          // Llama a /api/usuarios/oficinas/ usando el Token correcto
          const res = await solicitudesApi.oficinasListar({});
          const data = Array.isArray(res) ? res : (res?.results || res?.data || []);
          setOficinas(data);
          console.log("✅ Sucursales sincronizadas:", data.length);
        } catch (error) {
          console.error("❌ Error cargando sucursales:", error);
          if (error.status !== 401) {
            toast.error("Error al sincronizar sucursales.");
          }
        } finally {
          setLoadingOficinas(false);
        }
      };
      fetchOfis();
    }
  }, [isOpen, isWebAdmin]);

  const camposOrdenados = [
    "nombre", "apellido", "dni_cuit_cuil", "telefono", 
    "email", "direccion", "localidad", "fecha_nacimiento"
  ];

  const getLabel = (key) => {
    switch (key) {
      case "dni_cuit_cuil": return "DNI / CUIT / CUIL";
      case "fecha_nacimiento": return "Fecha de Nacimiento";
      default: return key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  const isRequired = (key) => ["nombre", "apellido", "dni_cuit_cuil", "telefono"].includes(key);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-2xl rounded-t-3xl sm:rounded-3xl bg-[#0b0f1e] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
            initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header táctil */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                 <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 flex items-center justify-center text-sky-400 border border-sky-500/20 shadow-lg shadow-sky-900/20">
                    <HiUserAdd className="text-2xl" />
                 </div>
                 <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tighter leading-none">Alta de Cliente</h2>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-black mt-1">Registro Centralizado</p>
                 </div>
              </div>
              <button 
                type="button" 
                onClick={onClose} 
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-white transition-all active:scale-90"
              >
                <HiX className="text-2xl" />
              </button>
            </div>

            <form
              id="form-crear-cliente"
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-6 space-y-7 scrollbar-hide"
            >
              
              {/* SELECTOR DE SUCURSAL PARA ADMIN */}
              {isWebAdmin && (
                <div className="p-5 rounded-2xl bg-sky-500/5 border border-sky-500/20 shadow-inner">
                  <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest flex items-center gap-2 mb-3 ml-1">
                    <HiOfficeBuilding className="text-sm" /> Asignar a Sucursal Específica
                  </label>
                  <div className="relative">
                    <select
                      name="oficina"
                      value={formData.oficina || ""}
                      onChange={handleChange}
                      disabled={loadingOficinas}
                      className="h-14 w-full rounded-xl bg-black/60 border border-white/10 px-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-sky-500/50 transition-all cursor-pointer appearance-none shadow-xl"
                    >
                      <option value="">— Selección Automática (Tu perfil) —</option>
                      {oficinas.map(o => (
                        <option key={o.id} value={o.id}>{o.nombre}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                      <span className="text-xs">▼</span>
                    </div>
                  </div>
                  {loadingOficinas && <p className="text-[9px] text-sky-400/50 mt-2 ml-1 animate-pulse italic">Sincronizando sucursales...</p>}
                </div>
              )}

              {/* Grid de Datos Personales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {camposOrdenados.map((key) => (
                  <div key={key} className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] flex items-center justify-between ml-1">
                      <span>
                        {getLabel(key)}
                        {isRequired(key) && <span className="text-rose-500 ml-1.5">*</span>}
                      </span>
                    </label>
                    <input
                      type={key.includes("fecha") ? "date" : "text"}
                      name={key}
                      value={formData[key] ?? ""}
                      onChange={handleChange}
                      className="h-13 w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 text-sm font-bold text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all shadow-inner [color-scheme:dark]"
                      placeholder={`Escribir ${getLabel(key).toLowerCase()}...`}
                    />
                  </div>
                ))}
              </div>
            </form>

            <div className="px-6 py-6 border-t border-white/5 bg-black/40 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button 
                type="button" 
                onClick={onClose} 
                disabled={loading} 
                className="w-full sm:w-auto h-13 sm:h-11 px-8 rounded-xl bg-white/5 text-white/50 font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all active:scale-95 disabled:opacity-30"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                form="form-crear-cliente" 
                disabled={loading} 
                className="w-full sm:w-auto h-13 sm:h-11 px-10 rounded-xl bg-sky-500 text-black font-black uppercase text-[10px] tracking-widest shadow-lg shadow-sky-900/40 hover:bg-sky-400 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <><HiCheck className="text-lg" /> Finalizar Alta</>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ClienteCreateModal;