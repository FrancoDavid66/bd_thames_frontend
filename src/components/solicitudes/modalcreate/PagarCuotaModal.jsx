// src/components/solicitudes/modalcreate/PagarCuotaModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiX, HiCash, HiCalendar, HiCreditCard } from "react-icons/hi";

function ymdLocal(d = new Date()) {
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, "0");
  const D = String(d.getDate()).padStart(2, "0");
  return `${Y}-${M}-${D}`;
}

export default function PagarCuotaModal({
  open,
  onClose,
  onConfirm,
  defaultMonto = "",
  defaultFecha = new Date(),
}) {
  const [monto, setMonto] = useState(String(defaultMonto ?? ""));
  const [fecha, setFecha] = useState(ymdLocal(defaultFecha || new Date()));
  const [forma, setForma] = useState("efectivo"); // efectivo | transferencia
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (open) {
      setMonto(String(defaultMonto ?? ""));
      setFecha(ymdLocal(defaultFecha || new Date()));
      setForma("efectivo");
    }
  }, [open, defaultMonto, defaultFecha]);

  const disabled = useMemo(() => {
    const m = Number(monto);
    return !m || Number.isNaN(m) || m <= 0 || !fecha || !forma;
  }, [monto, fecha, forma]);

  const handleConfirm = () => {
    if (disabled) return;
    onConfirm?.({ monto: Number(monto), forma_pago: forma, fecha_pago: fecha });
  };

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[95]">
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
                <HiCash className="text-amber-300" />
                <h3 className="font-semibold">Marcar como pagada</h3>
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
                Monto
                <div className="mt-1 flex items-center gap-2">
                  <span className="px-2 py-2 rounded-lg bg-white/10 border border-white/10 text-white/70 select-none">
                    $
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white outline-none focus:ring-2 focus:ring-amber-300/40"
                    placeholder="0.00"
                  />
                </div>
              </label>

              <label className="block text-sm text-white/80">
                Fecha de pago
                <div className="mt-1 relative">
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-3 py-2 pr-10 rounded-lg bg-white/10 border border-white/10 text-white outline-none focus:ring-2 focus:ring-amber-300/40"
                  />
                  <HiCalendar className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60" />
                </div>
              </label>

              <label className="block text-sm text-white/80">
                Forma de pago
                <div className="mt-1 relative">
                  <select
                    value={forma}
                    onChange={(e) => setForma(e.target.value)}
                    className="w-full px-3 py-2 pr-10 rounded-lg bg-white/10 border border-white/10 text-white outline-none focus:ring-2 focus:ring-amber-300/40"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                  <HiCreditCard className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60" />
                </div>
              </label>

              <p className="text-xs text-white/60">
                Al confirmar, se marcará pagada la cuota, se registrará el Ingreso en
                <span className="font-semibold"> balanzes</span> y podrás enviar el comprobante por WhatsApp.
              </p>
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
                Confirmar pago
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
