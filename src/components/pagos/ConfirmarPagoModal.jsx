// src/components/pagos/ConfirmarPagoModal.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiX, HiCash, HiSparkles, HiCamera, HiOutlineSwitchHorizontal } from "react-icons/hi";

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
  isWebAdmin,
  onOpenTraspaso // 🚀 NUEVA FUNCIÓN PARA ABRIR EL MODAL DE VENTAS
}) {
  const [cuponeraSubida, setCuponeraSubida] = useState(false);

  useEffect(() => {
    if (isOpen) setCuponeraSubida(false);
  }, [isOpen]);

  if (!isOpen || !confirmData) return null;

  const da = confirmData.diasAtraso || 0;
  const isCancelada = confirmData.polizaEstado === "CANCELADA" || confirmData.polizaEstado === "ANULADA";

  const cobNormalizada = String(confirmData.polizaCobertura || "").trim().toUpperCase();
  const compania = String(confirmData.polizaCompania || "").trim().toUpperCase();
  
  const isCoberturaA = 
    cobNormalizada === "A" || 
    cobNormalizada === "COBERTURA A" || 
    cobNormalizada === "RC" || 
    cobNormalizada.includes("RESPONSABILIDAD CIVIL");

  // 💡 Lógica de Detección de Misión
  const isNRE = compania.includes("NRE") || compania.includes("NUEVA RUTA");

  const tieneRobo = !isCancelada && !isCoberturaA && (
    cobNormalizada.includes("ROBO") ||
    cobNormalizada.includes("TERCEROS") ||
    cobNormalizada.includes("TODO RIESGO") ||
    cobNormalizada.includes("TR") ||
    cobNormalizada.includes("TC") ||
    cobNormalizada === "B" ||
    cobNormalizada === "C" ||
    cobNormalizada.includes("C1") ||
    cobNormalizada.includes("C+") ||
    cobNormalizada === "D"
  );

  let modalBgConfirm = "bg-slate-900 border-slate-800";
  let backdropBg = "bg-black/75 backdrop-blur-sm";

  if (isCancelada || da >= 15) {
    modalBgConfirm = "bg-slate-900 border-rose-900";
    backdropBg = "bg-black/75 backdrop-blur-sm";
  } else if (da >= 4) {
    modalBgConfirm = "bg-slate-900 border-amber-900";
    backdropBg = "bg-black/75 backdrop-blur-sm";
  } else if (da >= 1) {
    modalBgConfirm = "bg-slate-900 border-yellow-900/60";
    backdropBg = "bg-black/75 backdrop-blur-sm";
  }

  const botonBloqueado = confirmandoPago || (tieneRobo && !cuponeraSubida);

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
          className={`relative z-[66] w-full max-w-2xl rounded-2xl border px-6 py-6 shadow-2xl ${modalBgConfirm} max-h-[95vh] overflow-y-auto custom-scrollbar`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className={`text-xl font-bold text-slate-100`}>Confirmar pago</h3>
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

            {/* 🚨 ADVERTENCIAS DE RIESGO */}
            {isCancelada && (
              <div className="mb-4 p-3 bg-slate-950/60 border border-rose-900 rounded-lg text-rose-200 text-sm">
                ⚠️ <strong className="text-white">PÓLIZA DADA DE BAJA:</strong> Estás a punto de cobrar una cuota de una póliza cancelada. Esto se registrará como <b>recupero de deuda</b>.
              </div>
            )}

            {!isCancelada && da >= 15 && (
              <div className="mb-4 p-4 bg-rose-700/50 border border-rose-400/50 rounded-xl text-white text-sm border-l-2 border-rose-500">
                <div className="font-black text-xl mb-3">🚨 PELIGRO: ATRASO DE {da} DÍAS</div>
                <ul className="list-disc pl-5 font-bold space-y-2 text-white/90 text-base">
                  <li>VERIFICAR QUE LA PÓLIZA NO ESTÉ DADA DE BAJA EN LA COMPAÑÍA.</li>
                  <li>PREGUNTAR Y REVISAR SI TIENE O TUVO ALGÚN SINIESTRO.</li>
                </ul>
              </div>
            )}

            {!isCancelada && da >= 4 && da <= 14 && (
              <div className="mb-4 p-4 bg-amber-950/60 border border-amber-800 rounded-lg text-amber-100 text-sm">
                <div className="font-bold text-xl mb-3">⚠️ ATENCIÓN: ATRASO DE {da} DÍAS</div>
                <ul className="list-disc pl-5 font-semibold space-y-2 text-white/90 text-base">
                  <li>VERIFICAR QUE LA PÓLIZA NO ESTÉ DADA DE BAJA EN LA COMPAÑÍA.</li>
                  <li>PREGUNTAR Y REVISAR SI TIENE O TUVO ALGÚN SINIESTRO.</li>
                </ul>
              </div>
            )}

            {!isCancelada && da >= 1 && da <= 3 && (
              <div className="mb-4 p-3 bg-yellow-950/40 border border-yellow-900 rounded-lg text-yellow-100 text-sm">
                <div className="font-bold text-lg mb-2">👀 PRECAUCIÓN: {da} {da === 1 ? 'DÍA' : 'DÍAS'} DE ATRASO</div>
                <ul className="list-disc pl-5 font-medium text-yellow-50/90 text-sm space-y-1.5">
                  <li>Preguntar y revisar si tiene o tuvo algún siniestro.</li>
                </ul>
              </div>
            )}

            {/* 📸 VALIDACIÓN DE CUPONERA */}
            {tieneRobo && (
              <div className="mb-4 p-4 bg-slate-900 border border-sky-800 rounded-lg text-sky-100 text-sm">
                <div className="flex items-center gap-2 font-bold text-white text-base mb-2">
                  <HiCamera className="w-5 h-5 text-sky-400" />
                  SEGURO CON ROBO
                </div>
                <p className="mb-3 text-[13px] leading-relaxed text-sky-200">
                  Estás por cobrar un seguro que incluye Robo. <strong className="text-white">Tenés que pagar la cuponera y subir el comprobante</strong> para poder continuar.
                </p>
                <label className="flex items-center gap-3 cursor-pointer bg-sky-950/50 hover:bg-sky-900/80 transition-colors p-3 rounded-lg border border-sky-500/40">
                  <input 
                    type="checkbox" 
                    checked={cuponeraSubida} 
                    onChange={(e) => setCuponeraSubida(e.target.checked)} 
                    className="w-5 h-5 accent-sky-500 cursor-pointer rounded bg-slate-900 border-slate-700" 
                  />
                  <span className="text-white font-semibold text-[13px]">Ya pagué y subí la cuponera.</span>
                </label>
              </div>
            )}

            {/* CONTENIDO DEL PAGO */}
            <div className={`space-y-3 p-4 rounded-lg border ${'bg-slate-950 border-slate-800'}`}>
                <p className={`text-sm ${da >= 1 || isCancelada ? 'text-white/90' : 'text-slate-300'}`}>
                Vas a pagar la cuota <span className={`font-bold ${da >= 1 || isCancelada ? 'text-white' : 'text-emerald-400'}`}>#{confirmData.cuotaNro ?? "?"}</span> de la póliza <span className="font-bold text-white">{confirmData.numeroPoliza}</span>.
              </p>

              {isWebAdmin && confirmData.oficinaLabel && (
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${da >= 1 || isCancelada ? 'bg-white/10 border border-white/20 text-white' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'}`}>
                   🏢 Oficina: {confirmData.oficinaLabel}
                </div>
              )}

              <div className="mt-2 text-center">
                <p className={`text-xs uppercase tracking-[0.18em] mb-2 font-bold ${da >= 1 || isCancelada ? 'text-white/70' : 'text-slate-400'}`}>Importe a pagar</p>
                <p className={`text-4xl sm:text-5xl font-bold font-mono tracking-tight ${'text-emerald-400'}`}>
                  $ {fmtMoney(confirmData.monto)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={onClose}
                disabled={confirmandoPago}
                className={`h-11 px-6 rounded-xl border text-base font-medium cursor-pointer transition-colors ${
                  confirmandoPago ? "bg-slate-900/40 border-slate-800 text-slate-600" : da >= 1 || isCancelada ? "bg-black/30 hover:bg-black/50 border-black/40 text-white" : "bg-slate-900/50 hover:bg-slate-800 border-slate-600/50 text-white"
                }`}
              >
                Corregir
              </button>
              <button
                onClick={onConfirm}
                disabled={botonBloqueado}
                className={`h-11 px-6 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-colors border ${
                  botonBloqueado
                    ? "bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed"
                    : da >= 15 || isCancelada ? "bg-white text-rose-700 hover:bg-slate-100 shadow-[0_0_15px_rgba(255,255,255,0.3)] border-slate-200 cursor-pointer"
                    : da >= 4 ? "bg-white text-amber-700 hover:bg-slate-100 shadow-[0_0_15px_rgba(255,255,255,0.3)] border-slate-200 cursor-pointer"
                    : da >= 1 ? "bg-white text-yellow-700 hover:bg-slate-100 shadow-[0_0_15px_rgba(255,255,255,0.3)] border-slate-200 cursor-pointer"
                    : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] border-emerald-400 cursor-pointer"
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