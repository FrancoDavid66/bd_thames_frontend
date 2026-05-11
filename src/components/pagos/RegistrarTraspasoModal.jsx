// src/components/pagos/RegistrarTraspasoModal.jsx
import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { 
  HiX, HiSparkles, HiCurrencyDollar, HiOutlineSwitchHorizontal, 
  HiUser, HiCamera, HiClock 
} from "react-icons/hi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const MONEY_FMT = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
});

// 💡 Mock de vendedores (Luego esto vendrá de tu base de datos)
const VENDEDORES_MOCK = [
  { id: 1, nombre: "Rita" },
  { id: 2, nombre: "Carlos" },
  { id: 3, nombre: "Matias" },
  { id: 4, nombre: "Vendedor Extra" },
];

export default function RegistrarTraspasoModal({ isOpen, onClose, clienteData }) {
  const [vendedor, setVendedor] = useState("");
  const [companiaDestino, setCompaniaDestino] = useState("");
  const [coberturaDestino, setCoberturaDestino] = useState("");
  
  // Para el cálculo de sobreprecio en ROBO
  const [costoTecnico, setCostoTecnico] = useState("");
  const [precioCobrado, setPrecioCobrado] = useState("");

  const [comisionCalculada, setComisionCalculada] = useState(0);

  // Reiniciar formulario al abrir
  useEffect(() => {
    if (isOpen) {
      setVendedor("");
      setCompaniaDestino("");
      setCoberturaDestino("");
      setCostoTecnico("");
      setPrecioCobrado("");
      setComisionCalculada(0);
    }
  }, [isOpen]);

  // 🚀 MOTOR DE CÁLCULO DE COMISIONES (Reglas de Traspaso NRE)
  useEffect(() => {
    let comision = 0;
    const costo = Number(costoTecnico) || 0;
    const cobrado = Number(precioCobrado) || 0;
    const sobreprecio = Math.max(0, cobrado - costo);

    if (companiaDestino === "PROF") {
      if (coberturaDestino === "RC") comision = 10000;
      if (coberturaDestino === "RC_GRUA") comision = 15000;
    } else if (companiaDestino === "AMCA") {
      if (coberturaDestino === "ROBO") comision = 10000 + sobreprecio;
    }

    setComisionCalculada(comision);
  }, [companiaDestino, coberturaDestino, costoTecnico, precioCobrado]);

  const validarFormulario = () => {
    if (!vendedor) {
      toast.error("Seleccioná tu nombre (Vendedor)");
      return false;
    }
    if (!companiaDestino || !coberturaDestino) {
      toast.error("Completá los datos del traspaso");
      return false;
    }
    if (companiaDestino === "AMCA" && (!costoTecnico || !precioCobrado)) {
      toast.error("Ingresá los importes para calcular tu comisión");
      return false;
    }
    return true;
  };

  const handleRegistrar = () => {
    if (!validarFormulario()) return;
    toast.success("¡Traspaso cerrado! Tu comisión quedó Pendiente.", {
      style: { background: '#10b981', color: '#fff', fontWeight: 'bold' }
    });
    onClose();
  };

  const handleOportunidad = () => {
    if (!validarFormulario()) return;
    toast("Oportunidad Reservada por 15 días ⏳", {
      icon: '🤔',
      style: { background: '#f59e0b', color: '#fff', fontWeight: 'bold' }
    });
    onClose();
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onClose}>
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" />

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md overflow-hidden rounded-xl border border-indigo-800 bg-slate-900 shadow-md transition-all">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 bg-slate-900 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-indigo-400">
                    <HiOutlineSwitchHorizontal className="text-xl" />
                  </div>
                  <div>
                    <Dialog.Title className="text-lg font-bold text-white">
                      Traspaso de Cartera
                    </Dialog.Title>
                    <p className="text-xs text-indigo-200">
                      Ofreciendo a: <span className="font-bold">{clienteData?.nombre || "Asegurado"}</span>
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer">
                  <HiX className="h-6 w-6" />
                </button>
              </div>

              {/* Formulario */}
              <div className="p-6 space-y-5">
                
                {/* 0. Vendedor */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <HiUser /> ¿Quién está atendiendo?
                  </label>
                  <select 
                    value={vendedor} 
                    onChange={(e) => setVendedor(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Seleccionar tu nombre...</option>
                    {VENDEDORES_MOCK.map(v => (
                      <option key={v.id} value={v.id}>{v.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* 1. Compañía Destino */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500">Pasar a Compañía</label>
                    <select 
                      value={companiaDestino} 
                      onChange={(e) => { setCompaniaDestino(e.target.value); setCoberturaDestino(""); }}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm font-semibold text-white focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">Cía...</option>
                      <option value="PROF">PROF</option>
                      <option value="AMCA">AMCA</option>
                    </select>
                  </div>

                  {/* 2. Cobertura Destino */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500">Cobertura</label>
                    <select 
                      value={coberturaDestino} 
                      onChange={(e) => setCoberturaDestino(e.target.value)}
                      disabled={!companiaDestino}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm font-semibold text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                    >
                      <option value="">Plan...</option>
                      {companiaDestino === "PROF" && (
                        <>
                          <option value="RC">R.C. (Sin Grúa)</option>
                          <option value="RC_GRUA">R.C. + Grúa</option>
                        </>
                      )}
                      {companiaDestino === "AMCA" && (
                        <option value="ROBO">Con ROBO</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* ALERTA DE FOTOS PARA ROBO */}
                <AnimatePresence>
                  {companiaDestino === "AMCA" && coberturaDestino === "ROBO" && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: "auto" }} 
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl border border-sky-800 bg-slate-900 p-3 text-sky-100 text-xs shadow-md"
                    >
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <HiCamera className="text-sky-400 text-base" /> ¡OBLIGATORIO!
                      </div>
                      <p className="opacity-90">Para emitir el ROBO es obligatorio pedirle las <b>fotos del vehículo</b>. Anotalas en la bandeja de Emisiones.</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 3. Precios (Solo si es AMCA/Robo) */}
                <AnimatePresence>
                  {companiaDestino === "AMCA" && coberturaDestino === "ROBO" && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: "auto" }} 
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-2 gap-3"
                    >
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-slate-500">Costo Compañía</label>
                        <input 
                          type="number" 
                          placeholder="$"
                          value={costoTecnico}
                          onChange={(e) => setCostoTecnico(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-emerald-500">Cobrado al Cliente</label>
                        <input 
                          type="number" 
                          placeholder="$"
                          value={precioCobrado}
                          onChange={(e) => setPrecioCobrado(e.target.value)}
                          className="w-full rounded-xl border border-emerald-500/50 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-400 font-bold focus:border-emerald-400 focus:outline-none"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 4. Resumen de Comisión en Vivo */}
                <AnimatePresence>
                  {comisionCalculada > 0 && (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }} 
                      className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-5 text-center data-none=[20px_rgba(16,185,129,0.15)]"
                    >
                      <div className="flex items-center justify-center gap-2 text-emerald-400 mb-1">
                        <HiSparkles className="text-xl" />
                        <span className="text-xs font-bold uppercase tracking-widest">Tu comisión a ganar</span>
                      </div>
                      <div className="text-4xl font-semibold text-emerald-300 drop-shadow-md">
                        {MONEY_FMT.format(comisionCalculada)}
                      </div>
                      {companiaDestino === "AMCA" && (
                        <p className="mt-1 text-[10px] text-emerald-500/80 font-medium">
                          ($10.000 Base + {MONEY_FMT.format(Math.max(0, precioCobrado - costoTecnico))} Sobreprecio)
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

              {/* Footer con Múltiples Acciones */}
              <div className="border-t border-white/5 bg-slate-900/80 p-4 flex flex-col gap-3">
                <button 
                  onClick={handleRegistrar}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-bold text-white  transition-all hover:bg-emerald-600 "
                >
                  <HiCurrencyDollar className="text-xl" /> ¡Lo Vendí! Registrar Traspaso
                </button>
                
                <div className="flex gap-3">
                  <button 
                    onClick={onClose}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    Cerrar
                  </button>
                  <button 
                    onClick={handleOportunidad}
                    className="flex-[2] flex items-center justify-center gap-1.5 rounded-xl border border-amber-800 bg-amber-950/30 px-4 py-2.5 text-xs font-bold text-amber-400 hover:bg-amber-600/30 transition-colors"
                  >
                    <HiClock className="text-lg" /> Lo va a pensar (Reserva 15d)
                  </button>
                </div>
              </div>

            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}