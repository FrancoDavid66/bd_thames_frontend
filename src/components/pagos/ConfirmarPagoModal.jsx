// src/components/pagos/ConfirmarPagoModal.jsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiX, HiCash, HiSparkles } from "react-icons/hi";

const MONEY_FMT = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const fmtMoney = (n) => MONEY_FMT.format(Number(n || 0));

export default function ConfirmarPagoModal({ 
  isOpen, 
  confirmData, 
  confirmandoPago, 
  onClose, 
  onConfirm, 
  isWebAdmin 
}) {
  if (!isOpen || !confirmData) return null;

  const da = confirmData.diasAtraso || 0;
  const isCancelada = confirmData.polizaEstado === "CANCELADA" || confirmData.polizaEstado === "ANULADA";

  // 💡 Lógica de Cross-Selling (Oportunidad de Venta)
  const cobNormalizada = String(confirmData.polizaCobertura || "").trim().toUpperCase();
  const isCoberturaA = cobNormalizada === "A" || cobNormalizada === "COBERTURA A" || cobNormalizada.includes("RC") || cobNormalizada.includes("RESPONSABILIDAD CIVIL");

  let modalBgConfirm = "bg-slate-800 border-slate-700";
  let backdropBg = "bg-black/60 backdrop-blur-sm";

  // 🚨 Lógica de Semáforo de Riesgo (Teñimos toda la pantalla)
  if (isCancelada || da >= 15) {
    modalBgConfirm = "bg-rose-950 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.4)]";
    backdropBg = "bg-rose-950/90 backdrop-blur-md";
  } else if (da >= 4) {
    modalBgConfirm = "bg-amber-950 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.3)]";
    backdropBg = "bg-amber-950/90 backdrop-blur-md";
  } else if (da >= 1) {
    modalBgConfirm = "bg-slate-800 border-yellow-600/50 shadow-[0_0_30px_rgba(234,179,8,0.15)]";
    backdropBg = "bg-yellow-950/80 backdrop-blur-sm";
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[65] flex items-center justify-center px-3"
        >
          <div 
            className={`absolute inset-0 transition-colors duration-500 ${backdropBg}`} 
            onClick={confirmandoPago ? undefined : onClose} 
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className={`relative z-[66] w-full max-w-[420px] rounded-2xl border px-5 py-5 sm:px-6 sm:py-6 shadow-2xl transition-colors duration-300 ${modalBgConfirm}`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className={`text-base sm:text-lg font-bold text-white`}>Confirmar pago</h3>
              <button
                onClick={onClose}
                disabled={confirmandoPago}
                className={`h-8 w-8 sm:h-9 sm:w-auto sm:px-3 rounded-lg sm:rounded-xl border flex items-center justify-center cursor-pointer transition-colors ${
                  confirmandoPago ? "bg-slate-900/40 border-slate-800 text-slate-500" : da >= 1 || isCancelada ? "bg-black/30 hover:bg-black/50 border-black/30 text-white" : "bg-slate-900/50 hover:bg-slate-800 border-slate-600/50 text-slate-200"
                }`}
              >
                <HiX className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline ml-1 text-sm font-medium">Cancelar</span>
              </button>
            </div>

            {/* 🚨 ADVERTENCIAS DE RIESGO INTELIGENTES */}
            {isCancelada && (
              <div className="mb-4 p-3 bg-black/40 border border-black/40 rounded-xl text-rose-100 text-sm shadow-sm">
                ⚠️ <strong className="text-white">PÓLIZA DADA DE BAJA:</strong> Estás a punto de cobrar una cuota de una póliza cancelada. Esto se registrará como <b>recupero de deuda</b>.
              </div>
            )}

            {!isCancelada && da >= 15 && (
              <div className="mb-4 p-4 bg-rose-700/50 border border-rose-400/50 rounded-xl text-white text-sm shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-pulse">
                <div className="font-black text-base mb-2">🚨 PELIGRO: ATRASO DE {da} DÍAS</div>
                <ul className="list-disc pl-5 font-bold space-y-1 text-white/90">
                  <li>VERIFICAR QUE LA PÓLIZA NO ESTÉ DADA DE BAJA EN LA COMPAÑÍA.</li>
                  <li>PREGUNTAR Y REVISAR SI TIENE O TUVO ALGÚN SINIESTRO.</li>
                </ul>
              </div>
            )}

            {!isCancelada && da >= 4 && da <= 14 && (
              <div className="mb-4 p-4 bg-amber-600/50 border border-amber-400/50 rounded-xl text-white text-sm shadow-md">
                <div className="font-bold text-base mb-2">⚠️ ATENCIÓN: ATRASO DE {da} DÍAS</div>
                <ul className="list-disc pl-5 font-semibold space-y-1 text-white/90">
                  <li>VERIFICAR QUE LA PÓLIZA NO ESTÉ DADA DE BAJA EN LA COMPAÑÍA.</li>
                  <li>PREGUNTAR Y REVISAR SI TIENE O TUVO ALGÚN SINIESTRO.</li>
                </ul>
              </div>
            )}

            {!isCancelada && da >= 1 && da <= 3 && (
              <div className="mb-4 p-3 bg-yellow-600/40 border border-yellow-500/50 rounded-xl text-yellow-100 text-sm shadow-sm">
                <div className="font-bold mb-1">👀 PRECAUCIÓN: {da} {da === 1 ? 'DÍA' : 'DÍAS'} DE ATRASO</div>
                <ul className="list-disc pl-5 font-medium text-yellow-50/90">
                  <li>Preguntar y revisar si tiene o tuvo algún siniestro.</li>
                </ul>
              </div>
            )}

            {/* 💡 CROSS-SELLING: Oportunidad de Venta */}
            {!isCancelada && isCoberturaA && (
              <div className="mb-4 p-3 bg-indigo-600/20 border border-indigo-500/50 rounded-xl text-indigo-100 text-sm shadow-sm">
                <div className="flex items-center gap-1.5 font-bold mb-1 text-indigo-300">
                  <HiSparkles className="w-4 h-4 text-indigo-400" />
                  OPORTUNIDAD DE VENTA
                </div>
                <p className="text-indigo-200/90 text-[13px] leading-tight">
                  El vehículo tiene <strong>Cobertura A (RC)</strong>. ¡Aprovechá que el cliente está acá para <strong>ofrecerle cotizar ROBO</strong> por una pequeña diferencia!
                </p>
              </div>
            )}

            {/* CONTENIDO DEL PAGO */}
            <div className={`space-y-3 p-4 rounded-xl border ${da >= 1 || isCancelada ? 'bg-black/30 border-black/20' : 'bg-slate-900/80 border-slate-700/50'}`}>
              <p className={`text-xs sm:text-sm ${da >= 1 || isCancelada ? 'text-white/90' : 'text-slate-300'}`}>
                Vas a pagar la cuota <span className={`font-bold ${da >= 1 || isCancelada ? 'text-white' : 'text-emerald-400'}`}>#{confirmData.cuotaNro ?? "?"}</span> de la póliza <span className="font-bold text-white">{confirmData.numeroPoliza}</span>.
              </p>

              {isWebAdmin && confirmData.oficinaLabel && (
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${da >= 1 || isCancelada ? 'bg-white/10 border border-white/20 text-white' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'}`}>
                   🏢 Oficina: {confirmData.oficinaLabel}
                </div>
              )}

              <div className="mt-2 text-center">
                <p className={`text-[10px] sm:text-xs uppercase tracking-[0.18em] mb-1 font-bold ${da >= 1 || isCancelada ? 'text-white/70' : 'text-slate-400'}`}>Importe a pagar</p>
                <p className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${da >= 1 || isCancelada ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]' : 'text-emerald-400'}`}>
                  $ {fmtMoney(confirmData.monto)}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                onClick={onClose}
                disabled={confirmandoPago}
                className={`h-11 px-4 rounded-xl border text-sm font-bold cursor-pointer transition-all ${
                  confirmandoPago ? "bg-slate-900/40 border-slate-800 text-slate-600" : da >= 1 || isCancelada ? "bg-black/30 hover:bg-black/50 border-black/40 text-white" : "bg-slate-900/50 hover:bg-slate-800 border-slate-600/50 text-white"
                }`}
              >
                Corregir
              </button>
              <button
                onClick={onConfirm}
                disabled={confirmandoPago}
                className={`h-11 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all border ${
                  confirmandoPago ? "bg-emerald-900/50 text-emerald-200/40 border-emerald-800" : da >= 15 || isCancelada ? "bg-white text-rose-700 hover:bg-slate-100 shadow-white/30 border-slate-200" : da >= 4 ? "bg-white text-amber-700 hover:bg-slate-100 shadow-white/30 border-slate-200" : da >= 1 ? "bg-white text-yellow-700 hover:bg-slate-100 shadow-white/30 border-slate-200" : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30 border-emerald-400"
                }`}
              >
                {confirmandoPago ? (
                  <><span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> Confirmando…</>
                ) : (
                  <><HiCash className="w-5 h-5" /> Confirmar pago</>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}