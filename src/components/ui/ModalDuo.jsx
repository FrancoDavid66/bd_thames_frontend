// src/components/ui/ModalDuo.jsx
import { AnimatePresence, motion } from "framer-motion";
import { HiX } from "react-icons/hi";

/**
 * 🪟 Modal / Shell reutilizable de THAMES.
 * Overlay oscuro + caja que sube desde abajo en mobile y aparece centrada en desktop.
 * Maneja: cerrar al clickear afuera, cerrar con la X, header con ícono/título, y footer opcional.
 *
 * 🆕 Rediseño "profesional": esquinas rounded-2xl (antes rounded-3xl),
 * borde de 1px (antes 2px), título en peso semibold (antes black), y la
 * cajita de ícono del header ya no es un cuadrado de color grande — es
 * un ícono más chico y contenido.
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
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={`w-full ${ancho} rounded-t-2xl sm:rounded-2xl bg-card dark:bg-card-dark border border-linea dark:border-linea-dark shadow-xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]`}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-linea dark:border-linea-dark">
              <div className="flex items-center gap-3 min-w-0">
                {icon && (
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-lg shrink-0 ${it}`}>
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-titulo dark:text-titulo-dark leading-none truncate">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-[12px] text-suave dark:text-suave-dark mt-1 truncate">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-suave dark:text-suave-dark hover:bg-surface dark:hover:bg-surface-dark hover:text-titulo dark:hover:text-titulo-dark transition-colors shrink-0"
                aria-label="Cerrar"
              >
                <HiX className="text-lg" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">{children}</div>

            {/* Footer (opcional) */}
            {footer && (
              <div className="px-5 py-4 border-t border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark flex flex-col sm:flex-row items-center justify-end gap-2.5">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
