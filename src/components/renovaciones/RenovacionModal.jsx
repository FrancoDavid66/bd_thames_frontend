// src/components/renovaciones/RenovacionModal.jsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import { HiX, HiExclamation } from "react-icons/hi";

// 🆕 Banner para errores estructurados
import ErrorBanner from "./ErrorBanner";

const cx = (...a) => a.filter(Boolean).join(" ");

// 🎯 Helper interno: obtener la última cuota de una lista
// (la de mayor cuota_nro y fecha_vencimiento)
function getUltimaCuota(cuotas) {
  if (!Array.isArray(cuotas) || cuotas.length === 0) return null;
  return [...cuotas]
    .filter((c) => c && c.fecha_vencimiento)
    .sort((a, b) => {
      // Primero por cuota_nro descendente
      const nroA = Number(a.cuota_nro || 0);
      const nroB = Number(b.cuota_nro || 0);
      if (nroB !== nroA) return nroB - nroA;
      // Después por fecha descendente
      return new Date(b.fecha_vencimiento) - new Date(a.fecha_vencimiento);
    })[0] || null;
}

export default function RenovacionModal({
  open,
  item,
  onClose,
  onSubmit,
  submitting,
  // 🆕 Error estructurado que viene del backend tras un intento fallido
  // Formato: { error, message, detail, action, context }
  error = null,
}) {
  const [nuevoNumero, setNuevoNumero] = useState("");
  const [nuevaCompania, setNuevaCompania] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState("");
  // 🆕 Tipo y precio: se confirman/corrigen a mano en cada renovación.
  const [tipo, setTipo] = useState("");
  const [precioCuota, setPrecioCuota] = useState("");

  const TIPOS_VEHICULO = ["Auto", "Camioneta", "Camion", "Moto", "Trailer"];

  // 🆕 Input que aparece SOLO cuando el backend dijo "COBERTURA_NO_CONFIGURADA"
  const [cantidadCuotasOverride, setCantidadCuotasOverride] = useState("");

  const necesitaOverride = error?.error === "COBERTURA_NO_CONFIGURADA";

  useEffect(() => {
    if (!open) return;

    setNuevoNumero(item?.numero_poliza || "");
    setNuevaCompania(item?.compania || "");
    setTipo(item?.tipo || "");
    setPrecioCuota("");

    // Default sugerido para override = cantidad de cuotas de la póliza original
    setCantidadCuotasOverride(
      item?.cantidad_cuotas ? String(item.cantidad_cuotas) : ""
    );

    // 🎯 LÓGICA UNIFICADA: la nueva póliza empieza el MISMO DÍA que venció
    // la última cuota de la póliza vieja (sin gap).
    let fechaCalculada = null;
    const ultimaCuota = getUltimaCuota(item?.cuotas);
    if (ultimaCuota?.fecha_vencimiento) {
      fechaCalculada = dayjs(ultimaCuota.fecha_vencimiento);
    }

    if (!fechaCalculada) {
      const fallbackStr =
        item?.ultima_cuota_vencimiento ||
        item?.vto_referencia ||
        item?.fecha_vencimiento ||
        item?.primer_pago;
      if (fallbackStr) {
        fechaCalculada = dayjs(fallbackStr);
      }
    }

    setNuevaFecha(fechaCalculada ? fechaCalculada.format("YYYY-MM-DD") : "");
  }, [open, item]);

  if (!open) return null;

  const handleSubmit = () => {
    const payload = {
      nuevoNumero: (nuevoNumero || "").trim() || undefined,
      nuevaCompania: (nuevaCompania || "").trim() || undefined,
      nuevaFecha: nuevaFecha || undefined,
      tipo: tipo || undefined,
      precio_cuota: precioCuota !== "" ? precioCuota : undefined,
    };

    // Si el banner muestra el input de cuotas y el usuario lo completó, lo enviamos
    if (necesitaOverride) {
      const n = parseInt(cantidadCuotasOverride, 10);
      if (Number.isFinite(n) && n > 0) {
        payload.cantidad_cuotas_override = n;
        // El backend lo lee como snake_case
        payload.cantidad_cuotas = n;
      }
    }

    onSubmit(payload);
  };

  const canSubmit =
    !!tipo &&
    (necesitaOverride
      ? Number.isFinite(parseInt(cantidadCuotasOverride, 10)) &&
        parseInt(cantidadCuotasOverride, 10) > 0
      : true);

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
          className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900 backdrop-blur-xl shadow-2xl max-h-[90vh] overflow-y-auto"
          initial={{ y: 18, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 18, opacity: 0, scale: 0.98 }}
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4 sticky top-0 bg-slate-900 z-10">
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
            {/* 🆕 Banner de error estructurado (cuando viene del backend) */}
            <AnimatePresence>
              {error && (
                <ErrorBanner error={error}>
                  {/* Input inline solo si el error es "COBERTURA_NO_CONFIGURADA" */}
                  {necesitaOverride && (
                    <div className="bg-black/30 rounded-lg p-3 mt-1">
                      <label className="text-xs font-bold text-white/90 mb-1.5 block">
                        Cantidad de cuotas (manual)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={cantidadCuotasOverride}
                          onChange={(e) => setCantidadCuotasOverride(e.target.value)}
                          disabled={submitting}
                          placeholder="Ej: 6"
                          className="w-24 rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-white text-sm outline-none focus:border-amber-400 transition-colors disabled:opacity-50"
                        />
                        <span className="text-[11px] text-white/60">
                          cuotas mensuales se van a generar
                        </span>
                      </div>
                    </div>
                  )}
                </ErrorBanner>
              )}
            </AnimatePresence>

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
              <label className="text-xs font-semibold text-white/90">Tipo de vehículo *</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/30 transition-colors"
              >
                <option value="" className="bg-slate-900">— Elegir —</option>
                {TIPOS_VEHICULO.map((t) => (
                  <option key={t} value={t} className="bg-slate-900">{t}</option>
                ))}
              </select>
              <div className="text-xs text-white/60">
                Confirmá o corregí el tipo (define el precio). Si nació mal cargado, corregilo acá.
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-semibold text-white/90">Precio de cuota (opcional)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={precioCuota}
                onChange={(e) => setPrecioCuota(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/30 transition-colors"
                placeholder="Ej: 35000"
              />
              <div className="text-xs text-white/60">
                Si lo dejás vacío, las cuotas quedan en $0 y se cargan después desde Pagos.
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

            <div className="grid gap-2">
              <label className="text-xs font-semibold text-white/90">Inicio de vigencia (alta)</label>
              <input
                type="date"
                value={nuevaFecha}
                onChange={(e) => setNuevaFecha(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
              />
              <div className="text-xs text-white/60">
                Es el día que <strong className="text-white/80">arranca la cobertura</strong>. Por defecto, el día que vence la última cuota de la póliza actual (así no queda hueco). La <strong className="text-white/80">1ª cuota vence un mes después</strong>.
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
                  submitting || !canSubmit
                    ? "bg-white/40 shadow-none cursor-not-allowed"
                    : "bg-emerald-400 hover:bg-emerald-300 shadow-emerald-500/20"
                )}
                disabled={submitting || !canSubmit}
                type="button"
                onClick={handleSubmit}
              >
                {submitting
                  ? "Procesando..."
                  : necesitaOverride
                  ? "Reintentar renovación"
                  : "Renovar póliza"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}