// src/components/comunes/ModalWrapper.jsx
//
// 🪟 Marco de modal simple (lo usa la Caja rápida: Ingreso / Egreso).
//
// 📱 En el celu sube desde abajo como HOJA (ocupa el ancho, cómoda para el
//    pulgar) y si el contenido es largo SCROLLEA adentro (antes quedaba
//    cortado arriba y abajo, sobre todo con el teclado abierto).
// 🖥️ Desde sm (640 px) se ve centrado como siempre.
//    Se cierra con la X o con Escape (tocar afuera NO cierra, como antes:
//    así no se pierde un monto a medio cargar por un toque de más).
import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { HiX } from 'react-icons/hi'

const ModalWrapper = ({ isOpen, onClose, title, children }) => {
  // El onClose del padre cambia en cada render: lo guardamos en un ref para no
  // volver a enganchar el Escape (ni tocar el scroll) a cada rato.
  const cerrarRef = useRef(onClose)
  useEffect(() => {
    cerrarRef.current = onClose
  }, [onClose])

  // Escape cierra + el fondo no scrollea mientras está abierto.
  useEffect(() => {
    if (!isOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') cerrarRef.current?.()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-linea bg-card text-titulo shadow-xl dark:border-linea-dark dark:bg-card-dark dark:text-titulo-dark sm:max-h-[90dvh] sm:rounded-xl"
      >
        {/* Encabezado fijo: título + X (40 px, cómoda para el dedo) */}
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-4 sm:px-6 sm:pt-5">
          <h2 className="min-w-0 pt-1.5 text-lg font-semibold leading-snug sm:text-xl">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-suave transition-colors hover:bg-surface hover:text-duo-rojo dark:text-suave-dark dark:hover:bg-surface-dark"
          >
            <HiX className="text-xl" />
          </button>
        </div>

        {/* Cuerpo: scrollea si no entra (+ la rayita del iPhone abajo) */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
          {children}
        </div>
      </motion.div>
    </div>
  )
}

export default ModalWrapper
