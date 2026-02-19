// src/components/solicitudes/modalcreate/PagarCuotaModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiX, HiCash, HiCalendar, HiCreditCard } from "react-icons/hi";

// Definimos variants inline para animaciones profesionales
const modalVariants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.18 } },
};

const sectionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.1 } },
};

const inputVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
};

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
        <motion.div
          className="fixed inset-0 z-[95] flex items-center justify-center p-4 sm:p-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-xs sm:max-w-md rounded-2xl border border-white/10 bg-[#121629] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <motion.div
              className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-white/10"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
            >
              <div className="flex items-center gap-2 text-white">
                <HiCash className="text-amber-300" />
                <h3 className="font-semibold text-base sm:text-lg">Marcar como pagada</h3>
              </div>
              <motion.button
                ref={closeBtnRef}
                onClick={onClose}
                className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
                aria-label="Cerrar"
                variants={buttonVariants}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
              >
                <HiX className="w-5 h-5" />
              </motion.button>
            </motion.div>

            {/* Body */}
            <motion.div
              className="p-3 sm:p-4 space-y-3"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
            >
              <motion.label className="block text-xs sm:text-sm text-white/80" variants={inputVariants} initial="initial" animate="animate" whileHover="hover" whileTap="tap">
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
              </motion.label>

              <motion.label className="block text-xs sm:text-sm text-white/80" variants={inputVariants} initial="initial" animate="animate" whileHover="hover" whileTap="tap">
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
              </motion.label>

              <motion.label className="block text-xs sm:text-sm text-white/80" variants={inputVariants} initial="initial" animate="animate" whileHover="hover" whileTap="tap">
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
              </motion.label>

              <motion.p className="text-xs text-white/60" variants={inputVariants} initial="initial" animate="animate">
                Al confirmar, se marcará pagada la cuota, se registrará el Ingreso en
                <span className="font-semibold"> balanzes</span> y podrás enviar el comprobante por WhatsApp.
              </motion.p>
            </motion.div>

            {/* Footer */}
            <motion.div
              className="flex items-center justify-end gap-2 px-3 sm:px-4 py-2 sm:py-3 border-t border-white/10"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
            >
              <motion.button
                onClick={onClose}
                className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white/80 hover:text-white hover:bg-white/15"
                variants={buttonVariants}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
              >
                Cancelar
              </motion.button>
              <motion.button
                onClick={handleConfirm}
                disabled={disabled}
                className="px-4 py-2 rounded-xl font-semibold text-black bg-amber-400 border border-amber-300 hover:bg-amber-300 disabled:opacity-60"
                variants={buttonVariants}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
              >
                Confirmar pago
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}