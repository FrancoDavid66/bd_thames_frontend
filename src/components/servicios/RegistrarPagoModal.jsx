// src/components/servicios/RegistrarPagoModal.jsx  (diseño Duo)
import { useState, useEffect, Fragment } from "react";
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
  HiOutlineEye,
  HiOutlineDownload,
} from "react-icons/hi";
import { toast } from "react-toastify";
import dayjs from "dayjs";

import {
  registrarPagoServicio,
  deshacerPagoServicio,
} from "../../store/slices/serviciosSlice";
import { fetchMediosCobro } from "../../store/slices/pagosSlice";
import { uploadToCloudinary } from "../../utils/cloudinary";

// 🚀 Monto con separador de miles (es-AR): 20000 -> "20.000"
const montoToDisplay = (raw) => {
  if (raw === "" || raw == null) return "";
  const [i, d] = String(raw).split(".");
  const f = (i || "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return d != null ? `${f},${d}` : f;
};
const montoFromInput = (t) => {
  const c = String(t).replace(/[^\d,]/g, "");
  const [i, ...r] = c.split(",");
  const d = r.length ? r.join("").slice(0, 2) : null;
  return d != null ? `${i}.${d}` : i;
};

const PASOS = [
  { n: 1, label: "Monto" },
  { n: 2, label: "Pago" },
  { n: 3, label: "Comprobante" },
];

const labelForma = (v) =>
  v === "EFECTIVO" ? "Efectivo" : v === "TRANSFERENCIA" ? "Transferencia" : "Mercado Pago";

export default function RegistrarPagoModal({ pago, onClose, onSuccess }) {
  const dispatch = useDispatch();
  const mediosCobro = useSelector((s) => s.pagos.mediosCobro || []);
  const submitting = useSelector((s) => s.servicios.submitting);

  const yaPagado = pago?.estado === "PAGADO";

  const [step, setStep] = useState(1);
  // El monto se carga al momento de pagar (estos gastos suelen variar mes a mes),
  // por eso NO se pre-carga con el estimado del servicio.
  const [monto, setMonto] = useState(yaPagado ? pago.monto_real : "");
  const [fecha, setFecha] = useState(yaPagado ? pago.fecha_pago : dayjs().format("YYYY-MM-DD"));
  const [formaPago, setFormaPago] = useState(yaPagado ? pago.forma_pago : "TRANSFERENCIA");
  const [medioCobroId, setMedioCobroId] = useState(yaPagado ? (pago.medio_cobro ?? "") : "");
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [comprobanteUrl, setComprobanteUrl] = useState(yaPagado ? pago.comprobante_url : null);
  const [observaciones, setObservaciones] = useState(yaPagado ? pago.observaciones || "" : "");
  const [subiendo, setSubiendo] = useState(false);
  // 🐛 FIX: el `submitting` de Redux NO cubre "deshacer" (solo registrar). Sin
  //   esto, el botón Deshacer se puede clickear 2 veces y borra el egreso 2 veces.
  const [deshaciendo, setDeshaciendo] = useState(false);

  // 🚀 Billeteras filtradas por oficina (string) o todas si no hay oficina
  useEffect(() => {
    if (pago?.oficina) {
      dispatch(fetchMediosCobro({ oficina: String(pago.oficina), activo: true }));
    } else {
      dispatch(fetchMediosCobro({ activo: true }));
    }
  }, [dispatch, pago?.oficina]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setComprobanteFile(file);
    setComprobanteUrl(URL.createObjectURL(file));
  };

  // ── Validación por paso (se corre al tocar "Siguiente") ──
  // El comprobante (paso 3) es OPCIONAL, por eso no se valida acá.
  const validarPaso = (s) => {
    if (s === 1) {
      if (!monto || !Number.isFinite(Number(monto)) || Number(monto) <= 0) {
        toast.error("Ingresá un monto válido"); return false;
      }
      if (!fecha) { toast.error("Falta la fecha"); return false; }
    }
    if (s === 2) {
      if (formaPago !== "EFECTIVO" && !medioCobroId) { toast.error("Seleccioná la cuenta"); return false; }
    }
    return true;
  };

  const siguiente = () => {
    if (!validarPaso(step)) return;   // 🐛 antes validarPaso no se llamaba nunca
    setStep((v) => Math.min(3, v + 1));
  };
  const atras = () => setStep((v) => Math.max(1, v - 1));

  const handleSubmit = async () => {
    // Validar TODO junto y avisar de una sola vez lo que falte
    const faltan = [];
    if (!monto || Number(monto) <= 0) faltan.push("el monto");
    if (!fecha) faltan.push("la fecha");
    if (formaPago !== "EFECTIVO" && !medioCobroId) faltan.push("la cuenta / billetera");
    // El comprobante es OPCIONAL: si lo subís se guarda, si no, se paga igual.

    if (faltan.length > 0) {
      toast.error(`Te falta completar: ${faltan.join(" · ")}`);
      // Llevar al primer paso donde falta algo
      if (!monto || Number(monto) <= 0 || !fecha) setStep(1);
      else if (formaPago !== "EFECTIVO" && !medioCobroId) setStep(2);
      else setStep(3);
      return;
    }

    try {
      setSubiendo(true);
      // Resolver la URL del comprobante:
      // - si hay archivo nuevo → se sube a Cloudinary (devuelve https://…)
      // - si ya había una URL guardada (pago previo) y es http(s) → se reutiliza
      // - cualquier otra cosa (blob:, vacío, null) NO es una URL válida
      let url = null;
      if (comprobanteFile) {
        const subida = await uploadToCloudinary(comprobanteFile, "rc-admin/servicios/comprobantes");
        // uploadToCloudinary devuelve un objeto { secure_url, public_id, ... }
        // → hay que tomar el link de adentro, no el objeto entero.
        url = subida?.secure_url || subida?.url || null;
      } else if (typeof comprobanteUrl === "string" && /^https?:\/\//i.test(comprobanteUrl)) {
        url = comprobanteUrl;
      }
      setSubiendo(false);

      const esUrlValida = typeof url === "string" && /^https?:\/\//i.test(url);

      await dispatch(registrarPagoServicio({
        id: pago.id,
        monto: Number(monto),
        fecha,
        forma_pago: formaPago,
        medio_cobro_id: formaPago === "EFECTIVO" ? null : Number(medioCobroId),
        observaciones,
        // Solo se envía si es una URL real (https://…); si no, se omite y el backend no rebota
        ...(esUrlValida ? { comprobante_url: url } : {}),
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
    if (deshaciendo) return;  // 🐛 evita doble-click
    if (!confirm("¿Deshacer este pago? Se borrará el egreso vinculado en Balanzes.")) return;
    try {
      setDeshaciendo(true);
      await dispatch(deshacerPagoServicio(pago.id)).unwrap();
      toast.success("Pago deshecho");
      onSuccess();
    } catch (err) {
      const msg = err?.error || err?.detail || "Error al deshacer";
      toast.error(typeof msg === "string" ? msg : "Error al deshacer");
    } finally {
      setDeshaciendo(false);
    }
  };

  // 🚀 Sin decimales en el resumen: $40.000
  const fmt = (n) => `$${Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
  const inputCls = "w-full px-3 h-11 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark focus:border-oficina focus:outline-none text-sm font-bold text-titulo dark:text-titulo-dark disabled:opacity-60 transition-colors dark:[color-scheme:dark]";

  const cuentaLabel = (() => {
    const m = mediosCobro.find((x) => String(x.id) === String(medioCobroId));
    if (!m) return null;
    return m.etiqueta || m.titular_nombre || m.valor || `Cuenta ${m.id}`;
  })();

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
          className="w-full sm:max-w-lg bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[95vh] flex flex-col overflow-hidden"
        >
          {/* HEADER */}
          <div className="flex items-center justify-between px-5 py-4 border-b-2 border-linea dark:border-linea-dark shrink-0">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-suave dark:text-suave-dark uppercase tracking-wider mb-0.5 font-black">
                {yaPagado ? "Detalle del pago" : "Registrar pago"}
              </p>
              <h2 className="text-lg font-black text-titulo dark:text-titulo-dark truncate">
                {pago.servicio_nombre}
              </h2>
              {pago.fecha_vencimiento && (
                <p className="text-xs font-bold text-suave dark:text-suave-dark mt-0.5">
                  Vence: {dayjs(pago.fecha_vencimiento).format("DD/MM/YYYY")}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-3 w-10 h-10 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark hover:border-egreso hover:text-egreso flex items-center justify-center text-suave dark:text-suave-dark transition-colors shrink-0"
            >
              <HiX className="w-4 h-4" />
            </button>
          </div>

          {/* BODY */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {yaPagado ? (
              /* ════════ YA PAGADO: vista de detalle ════════ */
              <>
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-ingreso/10 border-2 border-ingreso/30">
                  <HiCheck className="w-5 h-5 text-ingreso shrink-0" />
                  <p className="text-sm text-ingreso dark:text-ingreso-claro font-black">
                    Pagado el {dayjs(pago.fecha_pago).format("DD/MM/YYYY")}
                  </p>
                </div>

                <Field label="Monto" icon={<HiOutlineCash className="w-3.5 h-3.5" />}>
                  <div className="flex items-center gap-2 w-full px-4 h-14 border-2 border-linea dark:border-linea-dark rounded-2xl bg-surface dark:bg-surface-dark">
                    <span className="text-2xl font-black text-suave dark:text-suave-dark">$</span>
                    <input type="text" value={montoToDisplay(monto)} disabled className="flex-1 min-w-0 bg-transparent outline-none text-2xl font-mono font-black text-titulo dark:text-titulo-dark disabled:opacity-60" />
                  </div>
                </Field>

                <Field label="Fecha del pago" icon={<HiOutlineCalendar className="w-3.5 h-3.5" />}>
                  <input type="date" value={fecha} disabled className={inputCls} />
                </Field>

                <Field label="Forma de pago" icon={<HiOutlineCreditCard className="w-3.5 h-3.5" />}>
                  <div className="h-11 flex items-center px-3 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark text-sm font-black text-titulo dark:text-titulo-dark">
                    {labelForma(formaPago)}
                  </div>
                </Field>

                <Field label="Comprobante" icon={<HiOutlineReceiptTax className="w-3.5 h-3.5" />}>
                  {comprobanteUrl ? (
                    <div className="space-y-2">
                      <div className="relative rounded-2xl overflow-hidden border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark">
                        {comprobanteUrl.toLowerCase().endsWith(".pdf") ? (
                          <a href={comprobanteUrl} target="_blank" rel="noreferrer" className="block p-6 text-center hover:bg-oficina/5 transition">
                            <HiOutlineDocumentText className="w-8 h-8 mx-auto text-suave dark:text-suave-dark mb-1" />
                            <p className="text-xs font-black text-titulo dark:text-titulo-dark">Abrir PDF</p>
                          </a>
                        ) : (
                          <a href={comprobanteUrl} target="_blank" rel="noreferrer" title="Ver en grande">
                            <img src={comprobanteUrl} alt="Comprobante" className="w-full max-h-64 object-contain hover:opacity-90 transition" />
                          </a>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={comprobanteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-linea dark:border-linea-dark text-sm font-black text-titulo dark:text-titulo-dark hover:border-oficina hover:text-oficina transition-colors"
                        >
                          <HiOutlineEye className="w-4 h-4" /> Ver en grande
                        </a>
                        <a
                          href={comprobanteUrl.includes("/upload/") ? comprobanteUrl.replace("/upload/", "/upload/fl_attachment/") : comprobanteUrl}
                          className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 rounded-xl bg-oficina text-white border-2 border-oficina text-sm font-black shadow-[0_3px_0_var(--color-oficina-fuerte)] active:shadow-[0_0_0_var(--color-oficina-fuerte)] active:translate-y-0.5 transition-all"
                        >
                          <HiOutlineDownload className="w-4 h-4" /> Descargar
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs font-bold text-suave dark:text-suave-dark">Sin comprobante</p>
                  )}
                </Field>

                {observaciones && (
                  <Field label="Notas">
                    <p className="text-sm font-bold text-titulo dark:text-titulo-dark">{observaciones}</p>
                  </Field>
                )}
              </>
            ) : (
              /* ════════ NO PAGADO: WIZARD ════════ */
              <>
                {/* Stepper */}
                <div className="flex items-center gap-2">
                  {PASOS.map((p, i) => (
                    <Fragment key={p.n}>
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-colors ${step >= p.n ? "bg-oficina text-white border-oficina" : "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border-linea dark:border-linea-dark"}`}>
                          {p.n}
                        </div>
                        <span className={`text-xs font-black hidden sm:inline ${step >= p.n ? "text-titulo dark:text-titulo-dark" : "text-suave dark:text-suave-dark"}`}>{p.label}</span>
                      </div>
                      {i < PASOS.length - 1 && (
                        <div className={`flex-1 h-1 rounded-full ${step > p.n ? "bg-oficina" : "bg-linea dark:bg-linea-dark"}`} />
                      )}
                    </Fragment>
                  ))}
                </div>

                {/* PASO 1: Monto + Fecha */}
                {step === 1 && (
                  <div className="space-y-4">
                    <Field label="Monto" icon={<HiOutlineCash className="w-3.5 h-3.5" />}>
                      <div className="flex items-center gap-2 w-full px-4 h-14 border-2 border-linea dark:border-linea-dark rounded-2xl bg-surface dark:bg-surface-dark focus-within:border-oficina transition-colors">
                        <span className="text-2xl font-black text-suave dark:text-suave-dark">$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={montoToDisplay(monto)}
                          onChange={(e) => setMonto(montoFromInput(e.target.value))}
                          placeholder="0"
                          autoFocus
                          className="flex-1 min-w-0 bg-transparent outline-none text-2xl font-mono font-black text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark"
                        />
                      </div>
                    </Field>

                    <Field label="Fecha del pago" icon={<HiOutlineCalendar className="w-3.5 h-3.5" />}>
                      <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
                    </Field>
                  </div>
                )}

                {/* PASO 2: Forma de pago + Cuenta */}
                {step === 2 && (
                  <div className="space-y-4">
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
                            onClick={() => setFormaPago(opt.v)}
                            className={`h-11 rounded-xl text-xs font-black transition-all border-2 ${
                              formaPago === opt.v
                                ? "bg-oficina text-white border-oficina shadow-[0_3px_0_var(--color-oficina-fuerte)] active:shadow-[0_0_0_var(--color-oficina-fuerte)] active:translate-y-0.5"
                                : "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border-linea dark:border-linea-dark hover:text-titulo dark:hover:text-titulo-dark"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </Field>

                    {formaPago !== "EFECTIVO" && (
                      <Field label="Cuenta">
                        <select value={medioCobroId} onChange={(e) => setMedioCobroId(e.target.value)} className={`${inputCls} cursor-pointer`}>
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
                          <p className="text-xs font-bold text-tarjeta mt-1">
                            ⚠️ No hay billeteras configuradas. Cargá una desde Configuración de Pagos.
                          </p>
                        )}
                      </Field>
                    )}

                    {formaPago === "EFECTIVO" && (
                      <p className="text-[11px] font-bold text-suave dark:text-suave-dark italic">
                        Pago en efectivo: no hace falta seleccionar cuenta.
                      </p>
                    )}
                  </div>
                )}

                {/* PASO 3: Comprobante + Notas + Resumen */}
                {step === 3 && (
                  <div className="space-y-4">
                    <Field
                      label={<>Comprobante <span className="text-suave dark:text-suave-dark font-bold normal-case">(opcional)</span></>}
                      icon={<HiOutlineReceiptTax className="w-3.5 h-3.5" />}
                    >
                      {comprobanteUrl ? (
                        <div className="relative rounded-2xl overflow-hidden border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark">
                          {comprobanteFile?.type === "application/pdf" || comprobanteUrl?.endsWith?.(".pdf") ? (
                            <a href={comprobanteUrl} target="_blank" rel="noreferrer" className="block p-6 text-center hover:bg-oficina/5 transition">
                              <HiOutlineDocumentText className="w-8 h-8 mx-auto text-suave dark:text-suave-dark mb-1" />
                              <p className="text-xs font-black text-titulo dark:text-titulo-dark">Ver PDF</p>
                            </a>
                          ) : (
                            <img src={comprobanteUrl} alt="" className="w-full h-36 object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => { setComprobanteFile(null); setComprobanteUrl(null); }}
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-egreso hover:bg-egreso-fuerte flex items-center justify-center text-white transition"
                          >
                            <HiX className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="block cursor-pointer">
                          <input type="file" accept="image/*,application/pdf" onChange={handleFile} className="hidden" />
                          <div className="rounded-2xl border-2 border-dashed border-linea dark:border-linea-dark hover:border-oficina hover:bg-oficina/5 px-4 py-6 text-center transition-colors">
                            <HiOutlineCloudUpload className="w-8 h-8 mx-auto text-suave dark:text-suave-dark mb-1.5" />
                            <p className="text-xs font-black text-titulo dark:text-titulo-dark">Subir comprobante</p>
                            <p className="text-[10px] font-bold text-suave dark:text-suave-dark mt-0.5">Foto o PDF</p>
                          </div>
                        </label>
                      )}
                    </Field>

                    <Field label="Notas (opcional)">
                      <textarea
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        rows={2}
                        placeholder="..."
                        className="w-full px-3 py-2 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark focus:border-oficina focus:outline-none resize-none text-sm font-bold text-titulo dark:text-titulo-dark transition-colors"
                      />
                    </Field>

                    {/* Resumen */}
                    <div className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-3 text-sm space-y-1.5">
                      <p className="text-[11px] font-black uppercase tracking-wider text-suave dark:text-suave-dark mb-1">Resumen</p>
                      <div className="flex justify-between"><span className="font-bold text-suave dark:text-suave-dark">Monto</span><span className="font-mono font-black text-titulo dark:text-titulo-dark">{fmt(monto)}</span></div>
                      <div className="flex justify-between"><span className="font-bold text-suave dark:text-suave-dark">Fecha</span><span className="font-bold text-titulo dark:text-titulo-dark">{dayjs(fecha).format("DD/MM/YYYY")}</span></div>
                      <div className="flex justify-between"><span className="font-bold text-suave dark:text-suave-dark">Forma de pago</span><span className="font-bold text-titulo dark:text-titulo-dark">{labelForma(formaPago)}</span></div>
                      {formaPago !== "EFECTIVO" && (
                        <div className="flex justify-between"><span className="font-bold text-suave dark:text-suave-dark">Cuenta</span><span className="font-bold text-titulo dark:text-titulo-dark">{cuentaLabel || "—"}</span></div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* FOOTER */}
          <div className="px-5 py-4 border-t-2 border-linea dark:border-linea-dark shrink-0 bg-card dark:bg-card-dark">
            {yaPagado ? (
              <button
                type="button"
                onClick={handleDeshacer}
                disabled={submitting || deshaciendo}
                className="w-full h-12 rounded-2xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark hover:border-egreso hover:bg-egreso/10 text-suave dark:text-suave-dark hover:text-egreso font-black text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deshaciendo ? (
                  <>
                    <div className="w-4 h-4 border-2 border-egreso/40 border-t-egreso rounded-full animate-spin" />
                    Deshaciendo...
                  </>
                ) : "Deshacer pago"}
              </button>
            ) : (
              <div className="flex gap-2">
                {step === 1 ? (
                  <button type="button" onClick={onClose} className="flex-1 h-12 rounded-2xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark hover:border-egreso hover:text-egreso text-titulo dark:text-titulo-dark font-black text-sm transition-colors">
                    Cancelar
                  </button>
                ) : (
                  <button type="button" onClick={atras} className="flex-1 h-12 rounded-2xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark hover:border-oficina text-titulo dark:text-titulo-dark font-black text-sm transition-colors">
                    ← Atrás
                  </button>
                )}

                {step < 3 ? (
                  <button type="button" onClick={siguiente} className="flex-1 h-12 rounded-2xl bg-oficina text-white border-2 border-oficina font-black text-sm shadow-[0_5px_0_var(--color-oficina-fuerte)] active:shadow-[0_0_0_var(--color-oficina-fuerte)] active:translate-y-0.5 transition-all">
                    Siguiente →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || subiendo}
                    className="flex-1 h-12 rounded-2xl bg-ingreso text-white border-2 border-ingreso font-black text-sm shadow-[0_5px_0_var(--color-ingreso-fuerte)] active:shadow-[0_0_0_var(--color-ingreso-fuerte)] active:translate-y-0.5 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-2"
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
      <label className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark mb-1.5">
        {icon}
        <span>{label}</span>
      </label>
      {children}
    </div>
  );
}
