// src/components/polizas/CuponRoboModal.jsx
import { useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { HiX, HiCalendar, HiCheckCircle } from "react-icons/hi";

import { useAuth } from "../../context/AuthContext";
import { createCuponRobo } from "../../store/slices/cuponesRoboSlice";

const ESTADOS = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "PAGADA", label: "Pagada" },
  { value: "VENCIDA", label: "Vencida" },
];

export default function CuponRoboModal({ isOpen, onClose, poliza }) {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const creating = useSelector((s) => s.cuponesRobo?.creating);

  const polizaId = poliza?.id;
  const cuotas = poliza?.cuotas || [];

  const [cuotaId, setCuotaId] = useState("");
  const [estado, setEstado] = useState("PENDIENTE");

  // Metadata de pago
  const [pagoFecha, setPagoFecha] = useState("");
  const [medioCobro, setMedioCobro] = useState("");
  const [notas, setNotas] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");

  const isPagada = useMemo(() => estado === "PAGADA", [estado]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!polizaId) {
      toast.error("Falta la póliza.");
      return;
    }
    if (!cuotaId) {
      toast.error("Elegí una cuota correspondiente.");
      return;
    }

    const cuotaSeleccionada = cuotas.find((c) => String(c.id) === String(cuotaId));
    if (!cuotaSeleccionada || !cuotaSeleccionada.fecha_vencimiento) {
      toast.error("La cuota seleccionada no tiene fecha de vencimiento válida.");
      return;
    }

    const start = dayjs(cuotaSeleccionada.fecha_vencimiento).startOf("month");
    const periodo_desde = start.format("YYYY-MM-DD");
    const periodo_hasta = start.endOf("month").format("YYYY-MM-DD");

    const payload = {
      polizaId,
      periodo_desde,
      periodo_hasta,
      estado,
    };

    if (isPagada) {
      if (pagoFecha) {
        const iso = dayjs(pagoFecha).isValid() ? dayjs(pagoFecha).toISOString() : null;
        if (iso) payload.fecha_pago = iso;
      }
      if (medioCobro.trim()) payload.medio_cobro = medioCobro.trim();
      if (notas.trim()) payload.notas = notas.trim();
      if (fotoUrl.trim()) payload.foto_url = fotoUrl.trim();
    }

    try {
      await dispatch(createCuponRobo(payload)).unwrap();
      toast.success("Cupón de robo creado exitosamente");
      setCuotaId("");
      setEstado("PENDIENTE");
      setPagoFecha("");
      setMedioCobro("");
      setNotas("");
      setFotoUrl("");
      onClose?.();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClose = () => {
    if (creating) return;
    onClose?.();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-950/95 p-5 sm:p-6 shadow-2xl"
            initial={{ scale: 0.9, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 16 }}
          >
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-neutral-50 disabled:opacity-50 transition-colors"
              disabled={creating}
            >
              <HiX className="h-4 w-4" />
            </button>

            <div className="mb-5 flex flex-col sm:flex-row sm:items-center gap-3 pr-8">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500/20 text-primary-300 shrink-0 border border-primary-500/20">
                <HiCalendar className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                   <h2 className="text-sm font-bold text-neutral-50 uppercase tracking-tight">
                    Vincular cupón de robo
                  </h2>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase border border-emerald-500/20">
                    {user?.perfil?.oficina_nombre || 'Local'}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 leading-snug font-medium">
                  Asigna el cupón a una de las cuotas existentes de la compañía.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Selector de Cuota */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-tighter">
                  Cuota correspondiente
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-900/80 px-3 py-2.5 focus-within:ring-2 ring-primary-500/40 transition-all">
                  <HiCalendar className="h-4 w-4 text-neutral-500" />
                  <select
                    className="flex-1 bg-transparent text-xs text-neutral-50 outline-none cursor-pointer"
                    value={cuotaId}
                    onChange={(e) => setCuotaId(e.target.value)}
                    required
                  >
                    <option value="" className="bg-neutral-900 text-neutral-500">Seleccioná una cuota de la póliza...</option>
                    {cuotas.map((cuota) => (
                      <option key={cuota.id} value={cuota.id} className="bg-neutral-900 text-neutral-50">
                        Cuota #{cuota.cuota_nro} - Vence: {dayjs(cuota.fecha_vencimiento).format("DD/MM/YYYY")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Estado */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-tighter">
                  Estado inicial
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-900/80 px-3 py-2.5 focus-within:ring-2 ring-primary-500/40 transition-all">
                  <HiCheckCircle className="h-4 w-4 text-neutral-500" />
                  <select
                    className="flex-1 bg-transparent text-xs text-neutral-50 outline-none cursor-pointer"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                  >
                    {ESTADOS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-neutral-900 text-neutral-50">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isPagada && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  className="space-y-3 rounded-2xl border border-primary-500/25 bg-primary-500/5 px-3 py-4"
                >
                  <p className="text-[10px] font-bold text-primary-300 uppercase tracking-widest text-center">
                    Registro de Egreso (Compañía)
                  </p>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Fecha y hora de pago</label>
                    <input type="datetime-local" className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-neutral-50 outline-none" value={pagoFecha} onChange={(e) => setPagoFecha(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Medio / billetera usada</label>
                    <input type="text" className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-neutral-50 outline-none" value={medioCobro} onChange={(e) => setMedioCobro(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Foto del cupón (URL)</label>
                    <input type="url" className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-neutral-50 outline-none" value={fotoUrl} onChange={(e) => setFotoUrl(e.target.value)} />
                  </div>
                </motion.div>
              )}

              <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
                <button type="button" onClick={handleClose} className="inline-flex flex-1 sm:flex-none items-center justify-center rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-neutral-400 hover:bg-white/5 hover:text-white transition-all uppercase" disabled={creating}>Cancelar</button>
                <button type="submit" disabled={creating} className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-primary-500 px-6 py-2.5 text-xs font-black text-neutral-950 hover:bg-primary-400 transition-all uppercase">
                  <span>Guardar cupón</span>
                  {creating && <span className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-950 border-t-transparent" />}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}