/* src/components/tareas/WizardShell.jsx  (responsive)
 *
 * "Cascarón" reutilizable de wizard/modal, compartido por Tareas del día
 * (TareaWizard) y Control diario (wizard de responsable).
 * Aporta: hoja que sube desde abajo, header con título/subtítulo, barra de
 * pasos opcional, botón cerrar y footer opcional. El contenido lo pone quien
 * lo usa (children). Usa la paleta semántica real (claro + oscuro).
 *
 * 📱 RESPONSIVE:
 *   - La hoja se limita a max-h-[92vh] y es una columna flex: header + barra
 *     fijos arriba, CONTENIDO con scroll propio en el medio, footer fijo abajo.
 *     Así en celulares bajitos el footer (botones) nunca queda tapado ni se
 *     corta: el que scrollea es el contenido, no la pantalla.
 */
import { motion, AnimatePresence } from "framer-motion";
import { HiX } from "react-icons/hi";
import { UI } from "./tareasUI";

/* Barra de pasos: puntitos que se llenan con el color marca. */
function Pasos({ total, actual }) {
  if (!total || total < 2) return null;
  return (
    <div className="mb-3.5 flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-[3px] flex-1 rounded-full ${i <= actual ? "bg-marca" : "bg-titulo/10 dark:bg-white/10"}`} />
      ))}
    </div>
  );
}

export default function WizardShell({
  open,
  titulo,
  subtitulo,
  pasoActual = 0,
  totalPasos = 0,
  onClose,
  footer,          // nodo opcional para los botones de abajo
  children,        // contenido del paso
  maxW = "max-w-lg",
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
        >
          <motion.div
            className={`w-full ${maxW} max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl ${UI.sheet} shadow-2xl overflow-hidden`}
            initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }} onClick={(e) => e.stopPropagation()}
          >
            {/* Header (fijo) */}
            <div className="shrink-0 flex items-center justify-between px-5 sm:px-6 pt-4 pb-3 border-b-2 border-linea dark:border-linea-dark">
              <div className="min-w-0">
                <h2 className={`text-base font-bold truncate ${UI.txtTitulo}`}>{titulo}</h2>
                {subtitulo ? <p className={`text-[11px] truncate ${UI.txtSuave}`}>{subtitulo}</p> : null}
              </div>
              <button onClick={onClose} aria-label="Cerrar"
                className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-lg bg-titulo/5 dark:bg-white/5 text-suave dark:text-suave-dark hover:opacity-70">
                <HiX className="text-xl" />
              </button>
            </div>

            {/* Barra de pasos (fija, si aplica) */}
            {totalPasos >= 2 && (
              <div className="shrink-0 px-5 sm:px-6 pt-3">
                <Pasos total={totalPasos} actual={pasoActual} />
              </div>
            )}

            {/* Contenido (scrollea) */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {children}
            </div>

            {/* Footer (fijo abajo, si aplica) */}
            {footer && (
              <div className="shrink-0 px-5 sm:px-6 py-4 sm:py-5 border-t-2 border-linea dark:border-linea-dark flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
