// src/components/siniestros/AlertaSiniestrosModal.jsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiCheckCircle, HiShieldExclamation } from "react-icons/hi";

import useSiniestrosCliente from "../../hooks/useSiniestrosCliente";
import AlertaSiniestrosBanner from "./AlertaSiniestrosBanner";

/**
 * Modal bloqueante que reutiliza el AlertaSiniestrosBanner.
 * Aparece cuando se abre el modal de un cliente que tiene siniestros.
 * El usuario DEBE apretar "Entendido" para poder cobrar.
 *
 * @param {boolean} isOpen           Si el modal está abierto.
 * @param {number|string} clienteId  ID del cliente.
 * @param {string} clienteNombre     Nombre para mostrar.
 * @param {Function} onConfirm       Callback cuando aprietan "Entendido".
 */
export default function AlertaSiniestrosModal({
  isOpen,
  clienteId,
  clienteNombre = "el asegurado",
  onConfirm,
}) {
  // Consultamos siniestros solo si está abierto (evita fetch innecesario)
  const { total, abiertos, loading } = useSiniestrosCliente(
    isOpen ? clienteId : null
  );

  // 🔬 DEBUG: sacar después de confirmar que funciona
  console.log("🛡️ [AlertaSiniestrosModal]", {
    isOpen,
    clienteId,
    clienteNombre,
    loading,
    total,
    abiertosLen: abiertos?.length ?? 0,
  });

  // 🐛 FIX: trackear si YA terminamos al menos una carga.
  // Sin esto, el modal puede auto-confirmarse prematuramente porque
  // `total === 0` durante el primer render mientras `loading` aún es false.
  const [yaCargo, setYaCargo] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setYaCargo(false);
      return;
    }
    if (!loading) {
      // Marcamos que ya tenemos la primera respuesta del backend
      setYaCargo(true);
    }
  }, [isOpen, loading]);

  // 🐛 FIX: si no hay clienteId, no podemos saber nada → auto-confirmar.
  useEffect(() => {
    if (isOpen && !clienteId) {
      Promise.resolve().then(() => onConfirm?.());
    }
  }, [isOpen, clienteId, onConfirm]);

  // 🐛 FIX: auto-confirmar SOLO después de cargar y confirmar que no hay siniestros.
  useEffect(() => {
    if (isOpen && yaCargo && !loading && total === 0 && clienteId) {
      Promise.resolve().then(() => onConfirm?.());
    }
  }, [isOpen, yaCargo, loading, total, clienteId, onConfirm]);

  if (!isOpen) return null;

  // Mientras carga la primera vez, mostramos un loader chico
  if (!yaCargo || loading) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 backdrop-blur-md">
        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Ya cargó. Si no hay siniestros, no renderizamos nada (el useEffect ya auto-confirmó).
  if (total === 0) return null;

  const hayAbiertos = abiertos.length > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="w-full max-w-2xl bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden"
        >
          {/* Franja superior pulsante si hay siniestros abiertos */}
          {hayAbiertos && (
            <div className="h-1.5 bg-rose-500 animate-pulse" />
          )}

          <div className="p-5 space-y-4">
            {/* Header con nombre del cliente */}
            <div className="text-center pb-2 border-b border-slate-800">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-rose-900/40 mb-2">
                <HiShieldExclamation className="w-7 h-7 text-rose-300" />
              </div>
              <p className="text-base font-bold text-slate-100">
                {clienteNombre}
              </p>
            </div>

            {/* 🎯 Banner reutilizado: mismo que ya te gusta */}
            <AlertaSiniestrosBanner
              clienteId={clienteId}
              contexto="antes de cobrar"
            />

            {/* Botón confirmar */}
            <motion.button
              type="button"
              onClick={onConfirm}
              whileTap={{ scale: 0.98 }}
              className={`w-full h-14 rounded-2xl font-black text-base text-white shadow-lg transition-colors inline-flex items-center justify-center gap-2 ${
                hayAbiertos
                  ? "bg-rose-600 hover:bg-rose-500 shadow-rose-900/40"
                  : "bg-amber-600 hover:bg-amber-500 shadow-amber-900/40"
              }`}
            >
              <HiCheckCircle className="w-5 h-5" />
              ENTENDIDO, CONTINUAR
            </motion.button>

            {hayAbiertos && (
              <p className="text-[11px] text-rose-400/70 text-center italic">
                Al continuar, confirmás que verificaste la situación con la compañía.
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}