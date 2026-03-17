// src/components/polizas/CuponRoboModal.jsx
import { useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { HiX, HiCalendar, HiCheckCircle } from "react-icons/hi";

// 🚀 IMPORTACIONES DE SEGURIDAD
import { useAuth } from "../../context/AuthContext";
import { createCuponRobo } from "../../store/slices/cuponesRoboSlice";

const ESTADOS = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "PAGADA", label: "Pagada" },
  { value: "VENCIDA", label: "Vencida" },
];

export default function CuponRoboModal({ isOpen, onClose, polizaId }) {
  const { user } = useAuth(); // 🚀 Obtenemos el usuario logueado
  const dispatch = useDispatch();
  const creating = useSelector((s) => s.cuponesRobo?.creating);

  const [month, setMonth] = useState("");
  const [estado, setEstado] = useState("PENDIENTE");

  // 🆕 Metadata de pago
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
    if (!month) {
      toast.error("Elegí un mes.");
      return;
    }

    const start = dayjs(`${month}-01`);
    if (!start.isValid()) {
      toast.error("Mes inválido.");
      return;
    }

    const periodo_desde = start.format("YYYY-MM-DD");
    const periodo_hasta = start.endOf("month").format("YYYY-MM-DD");

    const payload = {
      polizaId,
      periodo_desde,
      periodo_hasta,
      estado,
    };

    // Solo si el cupón ya nace como PAGADA mandamos metadata de pago
    if (isPagada) {
      if (pagoFecha) {
        const iso = dayjs(pagoFecha).isValid()
          ? dayjs(pagoFecha).toISOString()
          : null;
        if (iso) payload.fecha_pago = iso;
      }
      if (medioCobro.trim()) {
        payload.medio_cobro = medioCobro.trim();
      }
      if (notas.trim()) {
        payload.notas = notas.trim();
      }
      if (fotoUrl.trim()) {
        payload.foto_url = fotoUrl.trim();
      }
    }

    try {
      // El slice ya debe estar usando la instancia 'api' segura para evitar el 401
      await dispatch(createCuponRobo(payload)).unwrap();
      toast.success("Cupón de robo creado");
      // Reset
      setMonth("");
      setEstado("PENDIENTE");
      setPagoFecha("");
      setMedioCobro("");
      setNotas("");
      setFotoUrl("");
      onClose?.();
    } catch (err) {
      console.error(err);
      // El error 401 se maneja en el interceptor global
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-950/95 p-5 sm:p-6 shadow-2xl"
            initial={{ scale: 0.9, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 16 }}
          >
            {/* Cerrar */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-neutral-50 disabled:opacity-50 transition-colors"
              disabled={creating}
            >
              <HiX className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="mb-5 flex flex-col sm:flex-row sm:items-center gap-3 pr-8">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500/20 text-primary-300 shrink-0 border border-primary-500/20">
                <HiCalendar className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                   <h2 className="text-sm font-bold text-neutral-50 uppercase tracking-tight">
                    Nuevo cupón de robo
                  </h2>
                  {/* 🚀 INDICADOR DE SUCURSAL */}
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase border border-emerald-500/20">
                    {user?.perfil?.oficina_nombre || 'Local'}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 leading-snug font-medium">
                  Seleccioná el mes y el estado inicial. Si ya está pagado, completá los datos del egreso.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Mes */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-tighter">
                  Mes del cupón
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-900/80 px-3 py-2.5 focus-within:ring-2 ring-primary-500/40 transition-all">
                  <HiCalendar className="h-4 w-4 text-neutral-500" />
                  <input
                    type="month"
                    className="flex-1 bg-transparent text-xs text-neutral-50 outline-none"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    required
                  />
                </div>
                <p className="text-[10px] text-neutral-500 italic">
                  * El período se calcula automáticamente del 1 al último día del mes.
                </p>
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
                      <option
                        key={opt.value}
                        value={opt.value}
                        className="bg-neutral-900 text-neutral-50"
                      >
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bloque de datos de pago (solo si estado = PAGADA) */}
              {isPagada && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-3 rounded-2xl border border-primary-500/25 bg-primary-500/5 px-3 py-4"
                >
                  <p className="text-[10px] font-bold text-primary-300 uppercase tracking-widest text-center">
                    Registro de Egreso (Compañía)
                  </p>

                  {/* Fecha/hora de pago */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">
                      Fecha y hora de pago
                    </label>
                    <input
                      type="datetime-local"
                      className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-neutral-50 outline-none focus:ring-2 focus:ring-primary-400/40"
                      value={pagoFecha}
                      onChange={(e) => setPagoFecha(e.target.value)}
                    />
                  </div>

                  {/* Medio / billetera */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">
                      Medio / billetera usada
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-neutral-50 outline-none focus:ring-2 focus:ring-primary-400/40"
                      placeholder="Ej: Alias MP Manu, Ualá Leo, etc."
                      value={medioCobro}
                      onChange={(e) => setMedioCobro(e.target.value)}
                    />
                  </div>

                  {/* Foto del cupón */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">
                      Foto del cupón (URL)
                    </label>
                    <input
                      type="url"
                      className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-neutral-50 outline-none focus:ring-2 focus:ring-primary-400/40"
                      placeholder="Pegá la URL de la imagen si la tenés"
                      value={fotoUrl}
                      onChange={(e) => setFotoUrl(e.target.value)}
                    />
                  </div>

                  {/* Notas */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">
                      Notas internas
                    </label>
                    <textarea
                      rows={2}
                      className="w-full resize-none rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-neutral-50 outline-none focus:ring-2 focus:ring-primary-400/40"
                      placeholder="Detalle corto del pago..."
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                    />
                  </div>
                </motion.div>
              )}

              {/* Acciones */}
              <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex flex-1 sm:flex-none items-center justify-center rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-neutral-400 hover:bg-white/5 hover:text-white disabled:opacity-50 transition-all uppercase tracking-tighter"
                  disabled={creating}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-primary-500 px-6 py-2.5 text-xs font-black text-neutral-950 hover:bg-primary-400 shadow-lg shadow-primary-900/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 transition-all uppercase tracking-tight"
                >
                  <span>Guardar cupón</span>
                  {creating && (
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-950 border-t-transparent" />
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}