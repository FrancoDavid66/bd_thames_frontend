// src/components/renovaciones/RenovacionModal.jsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import { HiX, HiExclamation } from "react-icons/hi";

const cx = (...a) => a.filter(Boolean).join(" ");

export default function RenovacionModal({ open, item, onClose, onSubmit, submitting }) {
  const [nuevoNumero, setNuevoNumero] = useState("");
  const [nuevaCompania, setNuevaCompania] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState("");

  const [transferirGrua, setTransferirGrua] = useState(true);

  useEffect(() => {
    if (!open) return;

    setNuevoNumero(item?.numero_poliza || "");
    setNuevaCompania(item?.compania || "");
    setNuevoPrecio(
      item?.precio_cuota != null && item?.precio_cuota !== "" ? String(item?.precio_cuota) : ""
    );

    // 🚀 LÓGICA INTELIGENTE DE FECHAS
    let fechaCalculada = null;

    if (item?.cuotas && item.cuotas.length > 0) {
      // 1. Agarramos todas las cuotas y buscamos la que tenga el número más alto
      const ultimaCuota = [...item.cuotas].sort((a, b) => b.cuota_nro - a.cuota_nro)[0];
      
      if (ultimaCuota?.fecha_vencimiento) {
        // 2. Le sumamos exactamente 1 mes a la fecha de esa última cuota
        fechaCalculada = dayjs(ultimaCuota.fecha_vencimiento).add(1, 'month');
      }
    }

    // 3. Fallback: Si no tiene cuotas, busca otras referencias de la póliza
    if (!fechaCalculada) {
      const fallbackStr = item?.vto_referencia || item?.ultima_cuota_vencimiento || item?.fecha_vencimiento || item?.primer_pago;
      if (fallbackStr) {
        fechaCalculada = dayjs(fallbackStr);
      }
    }

    setNuevaFecha(fechaCalculada ? fechaCalculada.format("YYYY-MM-DD") : "");
    setTransferirGrua(true);
  }, [open, item]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900 backdrop-blur-xl shadow-2xl"
          initial={{ y: 18, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 18, opacity: 0, scale: 0.98 }}
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
            <div>
              <div className="text-lg font-extrabold text-white">Renovar póliza</div>
              <div className="mt-1 text-sm text-white/80">
                {item?.patente ? (
                  <>
                    <span className="font-semibold text-white">{item.patente}</span> ·{" "}
                    {item?.cliente?.apellido}, {item?.cliente?.nombre}
                  </>
                ) : (
                  <>
                    {item?.cliente?.apellido}, {item?.cliente?.nombre}
                  </>
                )}
              </div>
            </div>

            <button
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white hover:bg-white/15 transition-colors"
              onClick={onClose}
              disabled={submitting}
              title="Cerrar"
              type="button"
            >
              <HiX />
            </button>
          </div>

          <div className="grid gap-3 p-4">
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-white/90">Nuevo número (opcional)</label>
              <input
                value={nuevoNumero}
                onChange={(e) => setNuevoNumero(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/30 transition-colors"
                placeholder="Ej: 12345-ABC"
              />
              <div className="text-xs text-white/60">
                Si existe, el backend lo hace único (agrega sufijo -R1, -R2…).
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-semibold text-white/90">Nueva compañía (opcional)</label>
              <input
                value={nuevaCompania}
                onChange={(e) => setNuevaCompania(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/30 transition-colors"
                placeholder="Ej: RUS / SANCOR / etc."
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-white/90">Nuevo precio cuota (opcional)</label>
                <input
                  value={nuevoPrecio}
                  onChange={(e) => setNuevoPrecio(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/30 transition-colors"
                  placeholder="Ej: 12000"
                  inputMode="decimal"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-semibold text-white/90">Nueva fecha (primer pago)</label>
                <input
                  type="date"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
                />
              </div>
            </div>

            <div className="mt-1 rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-white">🚛 Mantener grúa en la renovación</div>
                  <div className="text-xs text-white/65 mt-1">
                    Si está activado, la póliza nueva queda con el servicio de grúa también (se transfiere la adhesión).
                    Si lo apagás, la póliza nueva se renueva sin grúa.
                  </div>
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setTransferirGrua((v) => !v)}
                  className={cx(
                    "relative inline-flex h-9 w-[74px] items-center rounded-full border transition shrink-0",
                    transferirGrua
                      ? "bg-emerald-400/25 border-emerald-300/30"
                      : "bg-white/10 border-white/15",
                    submitting ? "opacity-70" : "hover:bg-white/15"
                  )}
                  aria-pressed={transferirGrua}
                  title={transferirGrua ? "Se mantiene la grúa" : "No se transfiere la grúa"}
                >
                  <span
                    className={cx(
                      "absolute left-1 top-1 h-7 w-7 rounded-full shadow transition",
                      transferirGrua ? "translate-x-[38px] bg-emerald-200" : "translate-x-0 bg-white/70"
                    )}
                  />
                  <span className="sr-only">Transferir grúa</span>
                  <span className="w-full text-[11px] font-extrabold text-white/80 text-center">
                    {transferirGrua ? "SI" : "NO"}
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-1 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5">
              <HiExclamation className="mt-0.5 shrink-0 text-xl text-amber-400" />
              <div className="text-[13px] leading-relaxed text-amber-100/90">
                <strong className="block text-sm font-bold text-amber-400 mb-0.5">Atención</strong>
                La póliza actual pasará a estado <strong>FINALIZADA</strong> y se creará una nueva versión <strong>ACTIVA</strong>. 
                <br />
                <span className="mt-1 block opacity-90">No te olvides de emitir/subir la póliza en la página web de la aseguradora si corresponde.</span>
              </div>
            </div>

            <div className="mt-3 flex flex-col-reverse gap-2 md:flex-row md:justify-end">
              <button
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-white hover:bg-white/15 transition-colors"
                onClick={onClose}
                disabled={submitting}
                type="button"
              >
                Cancelar
              </button>

              <button
                className={cx(
                  "rounded-xl px-5 py-2 font-extrabold text-black transition-colors shadow-md",
                  submitting ? "bg-white/40 shadow-none" : "bg-emerald-400 hover:bg-emerald-300 shadow-emerald-500/20"
                )}
                disabled={submitting}
                type="button"
                onClick={() =>
                  onSubmit({
                    nuevoNumero: (nuevoNumero || "").trim() || undefined,
                    nuevaCompania: (nuevaCompania || "").trim() || undefined,
                    nuevoPrecio: nuevoPrecio === "" ? undefined : Number(nuevoPrecio),
                    nuevaFecha: nuevaFecha || undefined,
                    transferir_grua: transferirGrua ? 1 : 0,
                  })
                }
              >
                {submitting ? "Procesando..." : "Renovar póliza"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}