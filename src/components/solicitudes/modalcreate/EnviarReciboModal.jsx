// src/components/solicitudes/modalcreate/EnviarReciboModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiX, HiPaperAirplane, HiPhone, HiDocumentText } from "react-icons/hi";

function normalizeAR(raw) {
  if (!raw) return "";
  let d = String(raw).replace(/\D/g, "");
  if (d.startsWith("549")) d = d.slice(3);
  else if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.startsWith("15") && d.length >= 10) d = d.slice(2);
  return d;
}

export default function EnviarReciboModal({
  open,
  onClose,
  onConfirm,
  telefono = "",
  previewUrl = "",
}) {
  const [tel, setTel] = useState(normalizeAR(telefono || ""));
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (open) setTel(normalizeAR(telefono || ""));
  }, [open, telefono]);

  const disabled = useMemo(() => !tel || tel.length < 8, [tel]);

  const handleConfirm = () => {
    if (disabled) return;
    onConfirm?.({ telefono: tel });
  };

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[96]">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-modal="true"
            className="relative mx-auto mt-16 w-[92vw] max-w-md rounded-2xl border border-white/10 bg-[#121629] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-white">
                <HiPaperAirplane className="text-emerald-300 rotate-45" />
                <h3 className="font-semibold">Enviar comprobante al cliente</h3>
              </div>
              <button
                ref={closeBtnRef}
                onClick={onClose}
                className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
                aria-label="Cerrar"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              <label className="block text-sm text-white/80">
                Teléfono del cliente (Argentina)
                <div className="mt-1 relative">
                  <input
                    type="tel"
                    value={tel}
                    onChange={(e) => setTel(e.target.value)}
                    placeholder="11xxxxxxxx"
                    className="w-full px-3 py-2 pr-10 rounded-lg bg-white/10 border border-white/10 text-white outline-none focus:ring-2 focus:ring-amber-300/40"
                  />
                  <HiPhone className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60" />
                </div>
                <p className="mt-1 text-[11px] text-white/60">
                  Ingresá solo dígitos (sin +54, sin 0 ni 15).
                </p>
              </label>

              {previewUrl ? (
                <div className="mt-2 text-xs text-white/70 flex items-center gap-2">
                  <HiDocumentText className="text-white/60" />
                  <a
                    className="underline decoration-dotted underline-offset-2 hover:text-white"
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver comprobante (PDF)
                  </a>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/10">
              <button
                onClick={onClose}
                className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white/80 hover:text-white hover:bg-white/15"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={disabled}
                className="px-4 py-2 rounded-xl font-semibold text-black bg-amber-400 border border-amber-300 hover:bg-amber-300 disabled:opacity-60"
              >
                Abrir WhatsApp
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
