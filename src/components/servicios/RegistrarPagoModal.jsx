// src/components/servicios/RegistrarPagoModal.jsx
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiX,
  HiOutlineCloudUpload,
  HiCheck,
  HiOutlineDocumentText,
  HiOutlineCalendar,
  HiOutlineCreditCard,
  HiOutlineCash,
  HiOutlineReceiptTax,
} from "react-icons/hi";
import { toast } from "react-toastify";
import dayjs from "dayjs";

import {
  registrarPagoServicio,
  deshacerPagoServicio,
} from "../../store/slices/serviciosSlice";
import { fetchMediosCobro } from "../../store/slices/pagosSlice";
import { uploadToCloudinary } from "../../utils/cloudinary";

export default function RegistrarPagoModal({ pago, onClose, onSuccess }) {
  const dispatch = useDispatch();
  const mediosCobro = useSelector((s) => s.pagos.mediosCobro || []);
  const submitting = useSelector((s) => s.servicios.submitting);

  const yaPagado = pago?.estado === "PAGADO";

  const [monto, setMonto] = useState(yaPagado ? pago.monto_real : pago?.servicio_monto_estimado || "");
  const [fecha, setFecha] = useState(yaPagado ? pago.fecha_pago : dayjs().format("YYYY-MM-DD"));
  const [formaPago, setFormaPago] = useState(yaPagado ? pago.forma_pago : "TRANSFERENCIA");
  const [medioCobroId, setMedioCobroId] = useState(yaPagado ? pago.medio_cobro : "");
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [comprobanteUrl, setComprobanteUrl] = useState(yaPagado ? pago.comprobante_url : null);
  const [observaciones, setObservaciones] = useState(yaPagado ? pago.observaciones || "" : "");
  const [subiendo, setSubiendo] = useState(false);

  // 🚀 FIX: pedimos billeteras filtradas por oficina como STRING (MedioCobro.oficina es CharField)
  // y si no hay oficina, traemos todas las activas
  useEffect(() => {
    if (pago?.oficina) {
      // Convertimos a string porque el modelo lo guarda así
      dispatch(fetchMediosCobro({ oficina: String(pago.oficina), activo: true }));
    } else {
      // Si el servicio no tiene oficina, traemos todas las activas
      dispatch(fetchMediosCobro({ activo: true }));
    }
  }, [dispatch, pago?.oficina]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setComprobanteFile(file);
    setComprobanteUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!monto || Number(monto) <= 0) return toast.error("Ingresá un monto válido");
    if (!fecha) return toast.error("Falta la fecha");
    if (formaPago !== "EFECTIVO" && !medioCobroId) return toast.error("Seleccioná la cuenta");
    if (!comprobanteFile && !comprobanteUrl) return toast.error("Subí el comprobante");

    try {
      setSubiendo(true);
      const url = comprobanteFile
        ? await uploadToCloudinary(comprobanteFile, "rc-admin/servicios/comprobantes")
        : comprobanteUrl;
      setSubiendo(false);

      await dispatch(registrarPagoServicio({
        id: pago.id,
        monto: Number(monto),
        fecha,
        forma_pago: formaPago,
        medio_cobro_id: formaPago === "EFECTIVO" ? null : Number(medioCobroId),
        comprobante_url: url,
        observaciones,
      })).unwrap();

      toast.success(`✅ ${pago.servicio_nombre} pagado`);
      onSuccess();
    } catch (err) {
      setSubiendo(false);
      const msg = err?.error || err?.medio_cobro_id || err?.detail || "No se pudo registrar el pago";
      toast.error(typeof msg === "string" ? msg : "No se pudo registrar el pago");
    }
  };

  const handleDeshacer = async () => {
    if (!confirm("¿Deshacer este pago? Se borrará el egreso vinculado en Balanzes.")) return;
    try {
      await dispatch(deshacerPagoServicio(pago.id)).unwrap();
      toast.success("Pago deshecho");
      onSuccess();
    } catch (err) {
      const msg = err?.error || err?.detail || "Error al deshacer";
      toast.error(typeof msg === "string" ? msg : "Error al deshacer");
    }
  };

  const fmt = (n) => `$${Number(n || 0).toLocaleString("es-AR")}`;
  const inputCls = "w-full px-3 h-10 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-sky-400 focus:outline-none text-sm text-slate-900 dark:text-slate-100 disabled:opacity-60 transition";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-slate-900/80 dark:bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[95vh] flex flex-col overflow-hidden"
        >
          {/* HEADER */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5 font-semibold">
                {yaPagado ? "Detalle del pago" : "Registrar pago"}
              </p>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                {pago.servicio_nombre}
              </h2>
              {pago.fecha_vencimiento && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Vence: {dayjs(pago.fecha_vencimiento).format("DD/MM/YYYY")}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-3 w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition shrink-0"
            >
              <HiX className="w-4 h-4" />
            </button>
          </div>

          {/* FORM */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {yaPagado && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50">
                <HiCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                  Pagado el {dayjs(pago.fecha_pago).format("DD/MM/YYYY")}
                </p>
              </div>
            )}

            <Field label="Monto" icon={<HiOutlineCash className="w-3.5 h-3.5" />}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  disabled={yaPagado}
                  placeholder="0"
                  className="w-full pl-9 pr-3 h-12 text-xl font-bold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-sky-400 focus:outline-none text-slate-900 dark:text-slate-100 disabled:opacity-60 transition"
                />
              </div>
              {monto > 0 && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                  {fmt(monto)}
                </p>
              )}
            </Field>

            <Field label="Fecha del pago" icon={<HiOutlineCalendar className="w-3.5 h-3.5" />}>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                disabled={yaPagado}
                className={inputCls}
              />
            </Field>

            <Field label="Forma de pago" icon={<HiOutlineCreditCard className="w-3.5 h-3.5" />}>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: "EFECTIVO", label: "Efectivo" },
                  { v: "TRANSFERENCIA", label: "Transfer." },
                  { v: "MERCADOPAGO", label: "MP" },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    disabled={yaPagado}
                    onClick={() => setFormaPago(opt.v)}
                    className={`h-10 rounded-lg text-xs font-semibold transition ${
                      formaPago === opt.v
                        ? "bg-sky-500 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    } ${yaPagado ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>

            {formaPago !== "EFECTIVO" && !yaPagado && (
              <Field label="Cuenta">
                <select
                  value={medioCobroId}
                  onChange={(e) => setMedioCobroId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Seleccionar billetera...</option>
                  {mediosCobro.map((m) => {
                    const label = m.etiqueta || m.titular_nombre || m.valor || `Cuenta ${m.id}`;
                    const tipo = m.proveedor_display || m.proveedor || "";
                    return (
                      <option key={m.id} value={m.id}>
                        {label}{tipo ? ` (${tipo})` : ""}
                      </option>
                    );
                  })}
                </select>
                {mediosCobro.length === 0 && (
                  <p className="text-xs text-amber-500 mt-1">
                    ⚠️ No hay billeteras configuradas. Cargá una desde Configuración de Pagos.
                  </p>
                )}
              </Field>
            )}

            <Field
              label={<>Comprobante {!yaPagado && <span className="text-rose-500">*</span>}</>}
              icon={<HiOutlineReceiptTax className="w-3.5 h-3.5" />}
            >
              {comprobanteUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  {comprobanteFile?.type === "application/pdf" || comprobanteUrl?.endsWith?.(".pdf") ? (
                    <a
                      href={comprobanteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block p-6 text-center hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                      <HiOutlineDocumentText className="w-8 h-8 mx-auto text-slate-400 mb-1" />
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Ver PDF</p>
                    </a>
                  ) : (
                    <img src={comprobanteUrl} alt="" className="w-full h-36 object-cover" />
                  )}
                  {!yaPagado && (
                    <button
                      type="button"
                      onClick={() => {
                        setComprobanteFile(null);
                        setComprobanteUrl(null);
                      }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-rose-500 hover:bg-rose-400 flex items-center justify-center text-white transition"
                    >
                      <HiX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFile}
                    className="hidden"
                  />
                  <div className="rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 px-4 py-6 text-center transition">
                    <HiOutlineCloudUpload className="w-8 h-8 mx-auto text-slate-400 mb-1.5" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Subir comprobante</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Foto o PDF</p>
                  </div>
                </label>
              )}
            </Field>

            <Field label="Notas (opcional)">
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                disabled={yaPagado}
                rows={2}
                placeholder="..."
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-sky-400 focus:outline-none disabled:opacity-60 resize-none text-sm text-slate-900 dark:text-slate-100 transition"
              />
            </Field>
          </div>

          {/* FOOTER */}
          <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
            {yaPagado ? (
              <button
                type="button"
                onClick={handleDeshacer}
                disabled={submitting}
                className="w-full h-11 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 font-semibold text-sm transition disabled:opacity-50"
              >
                Deshacer pago
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || subiendo}
                className="w-full h-11 rounded-xl bg-sky-500 hover:bg-sky-400 font-bold text-white text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {subiendo || submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {subiendo ? "Subiendo..." : "Registrando..."}
                  </>
                ) : (
                  <>
                    <HiCheck className="w-4 h-4" />
                    Confirmar pago
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Field({ label, icon, children }) {
  return (
    <div>
      <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
        {icon}
        <span>{label}</span>
      </label>
      {children}
    </div>
  );
}