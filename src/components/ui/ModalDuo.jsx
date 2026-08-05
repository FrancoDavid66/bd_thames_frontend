// src/components/ui/ModalDuo.jsx
import { AnimatePresence, motion } from "framer-motion";
import { HiX } from "react-icons/hi";

/**
 * 🪟 Modal / Shell reutilizable estilo Duolingo.
 * Overlay oscuro + caja redonda que sube desde abajo en mobile y aparece centrada en desktop.
 * Maneja: cerrar al clickear afuera, cerrar con la X, header con ícono/título, y footer opcional.
 *
 * Props:
 *   isOpen: boolean
 *   onClose: fn
 *   title: título del header (string)
 *   subtitle: subtítulo opcional
 *   icon: elemento a mostrar en la cajita del header (opcional)
 *   iconTono: fondo de la cajita del icono: "azul"|"verde"|"rojo"|"amarillo"|"violeta" (default "azul")
 *   footer: contenido del pie (ej: botones). Si no pasás, no hay footer.
 *   size: "sm" | "md" | "lg"  (ancho máx; default "md")
 *   children: el contenido (body scrolleable)
 *
 * Ejemplo:
 *   <ModalDuo isOpen={open} onClose={cerrar} title="Alta de Cliente" icon={<HiUserAdd/>}
 *             footer={<><Boton3D variant="blanco" onClick={cerrar}>Cancelar</Boton3D>
 *                       <Boton3D variant="verde" type="submit" form="mi-form">Guardar</Boton3D></>}>
 *     ... campos ...
 *   </ModalDuo>
 */
const ICONO_TONO = {
  azul:     "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul",
  verde:    "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde",
  rojo:     "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo",
  amarillo: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo",
  violeta:  "bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta",
};
const ANCHOS = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl" };

export default function ModalDuo({
  isOpen,
  onClose,
  title,
  subtitle = null,
  icon = null,
  iconTono = "azul",
  footer = null,
  size = "md",
  children,
}) {
  const ancho = ANCHOS[size] || ANCHOS.md;
  const it = ICONO_TONO[iconTono] || ICONO_TONO.azul;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={`w-full ${ancho} rounded-t-3xl sm:rounded-3xl bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]`}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b-2 border-linea dark:border-linea-dark">
              <div className="flex items-center gap-3 min-w-0">
                {icon && (
                  <div className={`h-11 w-11 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${it}`}>
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-titulo dark:text-titulo-dark tracking-tight leading-none truncate">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-[11px] text-suave dark:text-suave-dark uppercase tracking-wide font-extrabold mt-1 truncate">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark transition-all active:scale-90 shrink-0"
                aria-label="Cerrar"
              >
                <HiX className="text-2xl" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">{children}</div>

            {/* Footer (opcional) */}
            {footer && (
              <div className="px-6 py-5 border-t-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark flex flex-col sm:flex-row items-center justify-end gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
