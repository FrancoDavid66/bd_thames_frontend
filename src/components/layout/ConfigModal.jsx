import { AnimatePresence, motion } from "framer-motion";
import { HiX, HiCog, HiClipboardList } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

export default function ConfigModal({ open, onClose }) {
  const navigate = useNavigate();

  const go = (to) => {
    navigate(to);
    onClose?.();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* overlay */}
          <motion.div
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          {/* modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            className="
              fixed z-[81] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
              w-[92vw] max-w-xl rounded-2xl border border-white/10
              bg-[#0f1629] text-white shadow-2xl
            "
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            {/* header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2 font-semibold">
                <HiCog className="opacity-80" />
                Configuración
              </div>
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 text-sm"
              >
                <HiX /> Cerrar
              </button>
            </div>

            {/* contenido */}
            <div className="p-4 space-y-4">
              {/* Acción: Compañías & Renovaciones */}
              <button
                onClick={() => go("/ajustes/companias")}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition"
                title="Gestionar compañías y sus planes de cuotas / meses de renovación"
              >
                <span className="inline-grid place-items-center w-10 h-10 rounded-lg bg-white/10">
                  <HiClipboardList />
                </span>
                <div className="min-w-0">
                  <div className="font-medium">Compañías &amp; Renovaciones</div>
                  <div className="text-xs text-white/70 truncate">
                    Alta, edición y planes de cuotas (meses de renovación)
                  </div>
                </div>
              </button>

              {/* Preferencias rápidas */}
              <div className="rounded-xl border border-white/10 p-3 bg-white/[0.04]">
                <div className="text-sm text-white/70 mb-2">Preferencias</div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/90">Tema</span>
                  <ThemeToggle small />
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
