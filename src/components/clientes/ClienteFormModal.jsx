// src/components/clientes/ClienteFormModal.jsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiUserAdd, HiPencilAlt, HiX, HiOfficeBuilding, HiCheck } from "react-icons/hi";
import toast from "react-hot-toast";

// 🚀 IMPORTACIONES
import { useAuth } from "../../context/AuthContext";
import { solicitudesApi } from "../../api/solicitudes";
import { useClienteForm } from "../../hooks/clientes/useClienteForm";
import Boton3D from "../ui/Boton3D";

/**
 * Modal UNIFICADO de cliente (reemplaza a ClienteCreateModal + ClienteEditModal).
 *
 * - Sin `cliente`  -> MODO ALTA   (título "Alta de Cliente", selector de oficina para admin)
 * - Con `cliente`  -> MODO EDICIÓN (título "Editar Cliente")
 *
 * Callbacks:
 *   onSuccess -> se llama al CREAR con éxito
 *   onSave    -> se llama al EDITAR con éxito
 */
const ClienteFormModal = ({ isOpen, onClose, cliente = null, onSuccess, onSave }) => {
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  const { formData, handleChange, handleSubmit, loading, modoEditar } = useClienteForm({
    cliente,
    onClose,
    onSuccess,
    onSave,
  });

  const [oficinas, setOficinas] = useState([]);
  const [loadingOficinas, setLoadingOficinas] = useState(false);

  // El selector de oficina solo aparece en ALTA para admin (al crear elegís sucursal;
  // al editar no se reasigna la oficina desde acá).
  const mostrarSelectorOficina = isWebAdmin && !modoEditar;

  // 🏢 Carga de sucursales reales (solo cuando corresponde mostrar el selector)
  useEffect(() => {
    if (isOpen && mostrarSelectorOficina) {
      const fetchOfis = async () => {
        setLoadingOficinas(true);
        try {
          const res = await solicitudesApi.oficinasListar({});
          const data = Array.isArray(res) ? res : res?.results || res?.data || [];
          setOficinas(data);
        } catch (error) {
          if (error.status !== 401) {
            toast.error("Error al sincronizar sucursales.");
          }
        } finally {
          setLoadingOficinas(false);
        }
      };
      fetchOfis();
    }
  }, [isOpen, mostrarSelectorOficina]);

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

  // DNI/CUIT es OPCIONAL. Obligatorios: nombre, apellido y teléfono.
  const isRequired = (key) => ["nombre", "apellido", "telefono"].includes(key);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-2xl rounded-t-3xl sm:rounded-3xl bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header táctil */}
            <div className="flex items-center justify-between px-6 py-5 border-b-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark">
              <div className="flex items-center gap-3">
                <div
                  className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${
                    modoEditar
                      ? "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde"
                      : "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul-sombra dark:text-duo-azul"
                  }`}
                >
                  {modoEditar ? <HiPencilAlt className="text-2xl" /> : <HiUserAdd className="text-2xl" />}
                </div>
                <div>
                  <h2 className="text-xl font-black text-titulo dark:text-titulo-dark leading-none">
                    {modoEditar ? "Editar Cliente" : "Alta de Cliente"}
                  </h2>
                  <p className="text-[11px] text-suave dark:text-suave-dark font-extrabold uppercase tracking-widest mt-1.5">
                    {modoEditar ? "Actualizá los datos de la ficha" : "Registro Centralizado"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-11 w-11 flex items-center justify-center rounded-2xl bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:text-duo-rojo hover:border-duo-rojo transition-all active:scale-90"
              >
                <HiX className="text-2xl" />
              </button>
            </div>

            <form
              id="form-cliente"
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-6 space-y-7 scrollbar-hide"
            >
              {/* SELECTOR DE SUCURSAL (solo ALTA + admin) */}
              {mostrarSelectorOficina && (
                <div className="p-5 rounded-2xl bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] border-2 border-duo-azul/30">
                  <label className="text-[11px] font-extrabold text-duo-azul-sombra dark:text-duo-azul uppercase tracking-widest flex items-center gap-2 mb-3 ml-1">
                    <HiOfficeBuilding className="text-base" /> Asignar a Sucursal Específica
                  </label>
                  <div className="relative">
                    <select
                      name="oficina"
                      value={formData.oficina || ""}
                      onChange={handleChange}
                      disabled={loadingOficinas}
                      className="h-14 w-full rounded-2xl bg-surface dark:bg-surface-dark border-[3px] border-linea dark:border-linea-dark px-4 text-sm font-extrabold text-titulo dark:text-titulo-dark outline-none focus:border-duo-azul transition-all cursor-pointer appearance-none"
                    >
                      <option value="">— Selección Automática (Tu perfil) —</option>
                      {oficinas.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.nombre}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-duo-azul">
                      <span className="text-xs">▼</span>
                    </div>
                  </div>
                  {loadingOficinas && (
                    <p className="text-[10px] text-duo-azul-sombra/70 dark:text-duo-azul/70 mt-2 ml-1 animate-pulse italic font-bold">
                      Sincronizando sucursales...
                    </p>
                  )}
                </div>
              )}

              {/* Grid de Datos Personales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {camposOrdenados.map((key) => (
                  <div key={key} className="flex flex-col gap-2">
                    <label className="text-[11px] font-extrabold text-suave dark:text-suave-dark uppercase tracking-[0.12em] flex items-center justify-between ml-1">
                      <span>
                        {getLabel(key)}
                        {isRequired(key) && <span className="text-duo-rojo ml-1.5">*</span>}
                      </span>
                    </label>
                    <input
                      type={key.includes("fecha") ? "date" : "text"}
                      name={key}
                      value={formData[key] ?? ""}
                      onChange={handleChange}
                      className="h-14 w-full rounded-2xl bg-surface dark:bg-surface-dark border-[3px] border-linea dark:border-linea-dark px-4 text-sm font-extrabold text-titulo dark:text-titulo-dark placeholder:text-suave/50 dark:placeholder:text-suave-dark/50 placeholder:font-bold focus:outline-none focus:border-duo-azul transition-all"
                      placeholder={`Escribir ${getLabel(key).toLowerCase()}...`}
                    />
                  </div>
                ))}
              </div>
            </form>

            <div className="px-6 py-6 border-t-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark flex flex-col sm:flex-row items-center justify-end gap-4">
              <Boton3D
                type="button"
                variant="blanco"
                size="md"
                onClick={onClose}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Boton3D>
              <Boton3D
                type="submit"
                form="form-cliente"
                variant="verde"
                size="md"
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <HiCheck className="text-lg" /> {modoEditar ? "Guardar Cambios" : "Finalizar Alta"}
                  </>
                )}
              </Boton3D>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ClienteFormModal;