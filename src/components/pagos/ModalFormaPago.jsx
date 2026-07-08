/* src/components/pagos/ModalFormaPago.jsx
   Wizard de pago en 4 pasos:
   1 → Método (efectivo / transferencia)
   2 → Billetera destino (solo transferencia)
   3 → Enviado por (solo transferencia)
   4 → Monto + fecha + confirmar
*/
import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { createPortal } from "react-dom";
import { Dialog, Transition } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiCash, HiRefresh, HiX, HiCalendar, HiPencil,
  HiChevronLeft, HiCheck, HiUser, HiArrowRight,
} from "react-icons/hi";
import { sendAdminPagoRegistrado } from "../../services/notifications/pagos";
import { solicitudesApi } from "../../services/solicitudes.js";

const LS_LAST_METODO  = "pagos:lastMetodo";
const LS_LAST_DESTINO = "pagos:lastDestinoCuenta";

function getLocalISODate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function isValidISODate(s) {
  if (!s || typeof s !== "string") return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return getLocalISODate(d) === s;
}
function safeGetLS(k) { try { return localStorage.getItem(k) || ""; } catch { return ""; } }
function safeSetLS(k, v) { try { localStorage.setItem(k, String(v ?? "")); } catch {} }
const fmtAR = (n) => {
  const num = Number(String(n ?? "").replace(",", "."));
  return Number.isFinite(num) ? `$ ${num.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$ —";
};

export default function ModalFormaPago({
  isOpen, onClose, onConfirm,
  defaultMonto,
  title = "Confirmar pago",
  cuentasMercadoPago = [],
  billeterasVirtuales = [],
  mediosCobro = [],
  clienteNombreApellido = "",
  clienteDni = "",
  polizaCompania = "",
  polizaCobertura = "",
  pagoCuota = "",
}) {
  /* ── Estado del wizard ── */
  const [step,         setStep]         = useState(1);
  const [metodo,       setMetodo]       = useState("efectivo");
  const [destinoId,    setDestinoId]    = useState("");
  const [destinoOtra,  setDestinoOtra]  = useState("");
  const [enviadoPor,   setEnviadoPor]   = useState("");
  const [cuitRemitente,setCuitRemitente]= useState("");
  const [nroOperacion, setNroOperacion] = useState("");
  const [monto,        setMonto]        = useState("");
  const [fechaPago,    setFechaPago]    = useState(getLocalISODate());
  const [observaciones,setObservaciones]= useState("");
  const [submitting,   setSubmitting]   = useState(false);
  // 🆕 Quién cobra
  const [responsableId, setResponsableId] = useState("");
  const [empleados, setEmpleados] = useState([]);
  const [empleadosLoading, setEmpleadosLoading] = useState(false);

  const inputMontoRef = useRef(null);

  // 🆕 El monto SIEMPRE es editable, cualquier compañía (incluida NRE).
  // El valor de `defaultMonto` es solo un precargado, no un precio fijo.

  /* ── Bloquear scroll ── */
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev || ""; };
  }, [isOpen]);

  /* ── Reset al abrir ── */
  useEffect(() => {
    if (!isOpen) return;
    const lastMetodo  = safeGetLS(LS_LAST_METODO);
    const lastDestino = safeGetLS(LS_LAST_DESTINO);
    setStep(1);
    setMetodo(lastMetodo === "transferencia" ? "transferencia" : "efectivo");
    setDestinoId(lastDestino || "");
    setDestinoOtra("");
    setEnviadoPor(clienteNombreApellido ? String(clienteNombreApellido).trim() : "");
    setCuitRemitente("");
    setNroOperacion("");
    setMonto(Number(defaultMonto) > 0 ? Number(defaultMonto).toLocaleString("es-AR") : "");
    setFechaPago(getLocalISODate());
    setObservaciones("");
    setSubmitting(false);
    setResponsableId("");
  }, [isOpen, clienteNombreApellido, defaultMonto]);

  // 🆕 Traer empleados activos (mismo endpoint que usa Solicitudes)
  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    setEmpleadosLoading(true);
    (async () => {
      try {
        const emps = await solicitudesApi.empleadosActivos();
        const arr = Array.isArray(emps) ? emps : emps?.results || [];
        if (alive) setEmpleados(arr.filter((e) => e?.activo !== false));
      } catch {
        if (alive) setEmpleados([]);
      } finally {
        if (alive) setEmpleadosLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [isOpen]);

  /* ── Medios normalizados ── */
  const medios = useMemo(() => {
    if (!Array.isArray(mediosCobro) || !mediosCobro.length) return [];
    return mediosCobro.filter(m => m && m.activo !== false).map(m => ({
      id: String(m.id),
      proveedor: m.proveedor,
      etiqueta: m.etiqueta || m.valor || "",
      titular: m.titular_nombre || "",
      valor: m.valor || "",
      display: `${m.titular_nombre ? m.titular_nombre + " — " : ""}${m.etiqueta || m.valor || ""}`.trim(),
    }));
  }, [mediosCobro]);

  const mediosMP  = useMemo(() => medios.filter(m => m.proveedor === "mercado_pago"), [medios]);
  const mediosBil = useMemo(() => medios.filter(m => m.proveedor === "billetera_virtual"), [medios]);
  const mpStrings = Array.isArray(cuentasMercadoPago) ? cuentasMercadoPago : [];
  const bilStrings= Array.isArray(billeterasVirtuales) ? billeterasVirtuales : [];

  const destinoEsOtra   = destinoId === "_otra_";
  const needsDestino    = metodo === "transferencia";
  const totalSteps      = needsDestino ? 4 : 2; // efectivo: 1(método) + 4(monto)

  /* ── Validaciones por paso ── */
  const montoNum = useMemo(() => {
    // Soporta: "30.000", "30,000", "30000", "30.000,50"
    const clean = String(monto)
      .replace(/\./g, "")   // quitar puntos de miles
      .replace(",", ".");   // coma decimal → punto
    const n = Number.parseFloat(clean);
    return Number.isFinite(n) && n > 0 ? n : NaN;
  }, [monto]);

  const canNext = useMemo(() => {
    if (step === 1) return true;
    if (step === 2) return (destinoId && !destinoEsOtra) || (destinoEsOtra && destinoOtra.trim() !== "");
    if (step === 3) return (
      enviadoPor.trim() !== "" &&
      cuitRemitente.trim() !== ""
    );
    if (step === 4) return Number.isFinite(montoNum) && isValidISODate(fechaPago) && !!responsableId;
    return false;
  }, [step, destinoId, destinoEsOtra, destinoOtra, enviadoPor, cuitRemitente, nroOperacion, montoNum, fechaPago, responsableId]);

  /* ── Navegación ── */
  const next = () => {
    if (step === 1) {
      // efectivo → salta pasos 2 y 3, va directo al monto (paso 4)
      setStep(metodo === "efectivo" ? 4 : 2);
    } else if (step === 2) setStep(3);
    else if (step === 3) { setStep(4); setTimeout(() => inputMontoRef.current?.focus(), 50); }
  };

  const back = () => {
    if (step === 4 && metodo === "efectivo") setStep(1);
    else if (step === 4) setStep(3);
    else if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  };

  /* ── Confirmar ── */
  const confirm = async () => {
    if (!canNext || submitting) return;
    setSubmitting(true);
    try {
      const medioSeleccionado = medios.find(m => m.id === destinoId);
      const destino = destinoEsOtra ? destinoOtra.trim()
        : medioSeleccionado ? medioSeleccionado.display
        : destinoId || "";

      // Armar observaciones con datos de auditoría para el balance
      const obsPartes = [];
      if (observaciones.trim()) obsPartes.push(observaciones.trim());
      if (needsDestino) {
        if (cuitRemitente.trim()) obsPartes.push(`CUIT: ${cuitRemitente.trim()}`);
        if (nroOperacion.trim())  obsPartes.push(`Op: ${nroOperacion.trim()}`);
      }

      const payload = {
        metodo, forma_pago: metodo,
        monto: Number(montoNum.toFixed(2)),
        fecha_pago: fechaPago,
        observaciones: obsPartes.join(" | ") || undefined,
        enviado_por: enviadoPor.trim() || undefined,
        cuit_remitente: needsDestino ? cuitRemitente.trim() || undefined : undefined,
        nro_operacion: needsDestino ? nroOperacion.trim() || undefined : undefined,
        destino_cuenta: needsDestino ? destino : undefined,
        medio_cobro_id: medioSeleccionado ? Number(medioSeleccionado.id) : undefined,
        destino_tipo: medioSeleccionado?.proveedor,
        // 🆕 Quién cobró
        responsable_empleado: Number(responsableId),
      };

      safeSetLS(LS_LAST_METODO, metodo);
      if (needsDestino) safeSetLS(LS_LAST_DESTINO, destinoId || "");

      await Promise.resolve(onConfirm?.(payload));

      try {
        await sendAdminPagoRegistrado({
          aviso: "Pago registrado",
          cliente_nombre_apellido: clienteNombreApellido,
          cliente_dni: clienteDni,
          poliza_compania: polizaCompania,
          poliza_cobertura: polizaCobertura,
          pago_monto: fmtAR(montoNum),
          pago_metodo: metodo,
          pago_cuota: pagoCuota,
          pago_destino: destino,
        });
      } catch {}
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Indicador de progreso ── */
  const stepLabels = metodo === "efectivo"
    ? ["Método", "Monto"]
    : ["Método", "Billetera", "Enviado por", "Monto"];

  const stepIndex = metodo === "efectivo"
    ? (step === 1 ? 0 : 1)
    : (step - 1);

  /* ── Variantes animación ── */
  const slideVariants = {
    enter:  { opacity: 0, x: 30 },
    center: { opacity: 1, x: 0 },
    exit:   { opacity: 0, x: -30 },
  };

  const content = (
    <Transition appear show={!!isOpen} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 z-[9999]" onClose={onClose}>
        <Transition.Child as={Fragment}
          enter="ease-out duration-150" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-120" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment}
              enter="ease-out duration-200" enterFrom="opacity-0 translate-y-3 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-3 scale-95">

              <Dialog.Panel className="w-full max-w-md overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl text-white">

                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <Dialog.Title className="text-base font-bold text-slate-100">
                      🤑 {title}
                    </Dialog.Title>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {clienteNombreApellido && <span className="text-slate-400">{clienteNombreApellido}</span>}
                      {pagoCuota && <span> · Cuota #{pagoCuota}</span>}
                    </p>
                  </div>
                  <button onClick={onClose} className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">
                    <HiX className="w-5 h-5" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="px-5 pt-4 pb-2">
                  <div className="flex items-center gap-1.5">
                    {stepLabels.map((label, i) => {
                      const done    = i < stepIndex;
                      const active  = i === stepIndex;
                      const pending = i > stepIndex;
                      const colors  = ["bg-emerald-500", "bg-sky-500", "bg-amber-500", "bg-pink-500"];
                      const textColors = ["text-emerald-400", "text-sky-400", "text-amber-400", "text-pink-400"];
                      return (
                        <div key={label} className="flex-1 flex flex-col items-center gap-1">
                          <div className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                            done ? "bg-emerald-500" : active ? colors[i] : "bg-slate-800"
                          }`} />
                          <span className={`text-[10px] font-medium transition-colors ${
                            done ? "text-emerald-500" : active ? textColors[i] : "text-slate-600"
                          }`}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Content — animated */}
                <div className="px-5 pb-5 min-h-[280px] flex flex-col">
                  <AnimatePresence mode="wait" initial={false}>

                    {/* ── PASO 1: Método ── */}
                    {step === 1 && (
                      <motion.div key="step1" variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.18 }}
                        className="flex-1 flex flex-col justify-center gap-4 py-4">
                        <p className="text-sm font-semibold text-slate-300 text-center mb-2">¿Cómo paga el cliente?</p>
                        <div className="grid grid-cols-2 gap-3">
                          {/* Efectivo */}
                          <button type="button" onClick={() => setMetodo("efectivo")}
                            className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-150 ${
                              metodo === "efectivo"
                                ? "border-emerald-500 bg-emerald-950/60 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                                : "border-slate-800 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-800/60"
                            }`}>
                            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-3xl transition-all ${
                              metodo === "efectivo" ? "bg-emerald-500/20" : "bg-slate-800"
                            }`}>
                              💵
                            </div>
                            <div className="text-center">
                              <div className={`text-sm font-bold ${metodo === "efectivo" ? "text-emerald-400" : "text-slate-300"}`}>
                                Efectivo
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">Pago en mano</div>
                            </div>
                            {metodo === "efectivo" && (
                              <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                <HiCheck className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>

                          {/* Transferencia */}
                          <button type="button" onClick={() => setMetodo("transferencia")}
                            className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-150 ${
                              metodo === "transferencia"
                                ? "border-sky-500 bg-sky-950/60 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                                : "border-slate-800 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-800/60"
                            }`}>
                            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-3xl transition-all ${
                              metodo === "transferencia" ? "bg-sky-500/20" : "bg-slate-800"
                            }`}>
                              🏦
                            </div>
                            <div className="text-center">
                              <div className={`text-sm font-bold ${metodo === "transferencia" ? "text-sky-400" : "text-slate-300"}`}>
                                Transferencia
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">MP / Bancaria</div>
                            </div>
                            {metodo === "transferencia" && (
                              <div className="h-5 w-5 rounded-full bg-sky-500 flex items-center justify-center">
                                <HiCheck className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* ── PASO 2: Billetera ── */}
                    {step === 2 && (
                      <motion.div key="step2" variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.18 }}
                        className="flex-1 flex flex-col gap-3 py-4">
                        <p className="text-sm font-semibold text-slate-300 text-center mb-2">¿A qué cuenta llegó la plata?</p>

                        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                          {/* Mercado Pago */}
                          {(mediosMP.length > 0 || mpStrings.length > 0) && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-sky-500 font-bold mb-1.5 px-1">Mercado Pago</p>
                              <div className="space-y-1.5">
                                {(mediosMP.length > 0 ? mediosMP : mpStrings.map((s, i) => ({ id: `mp-${i}`, display: s, proveedor: "mercado_pago" }))).map(m => (
                                  <button key={m.id} type="button" onClick={() => setDestinoId(String(m.id))}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                                      destinoId === String(m.id)
                                        ? "border-sky-500 bg-sky-950/60"
                                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                                    }`}>
                                    <span className="text-xl shrink-0">💳</span>
                                    <span className={`text-sm font-medium flex-1 ${destinoId === String(m.id) ? "text-sky-300" : "text-slate-300"}`}>
                                      {m.display}
                                    </span>
                                    {destinoId === String(m.id) && <HiCheck className="w-4 h-4 text-sky-400 shrink-0" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Billeteras virtuales */}
                          {(mediosBil.length > 0 || bilStrings.length > 0) && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-purple-400 font-bold mb-1.5 px-1">Billeteras virtuales</p>
                              <div className="space-y-1.5">
                                {(mediosBil.length > 0 ? mediosBil : bilStrings.map((s, i) => ({ id: `bil-${i}`, display: s }))).map(m => (
                                  <button key={m.id} type="button" onClick={() => setDestinoId(String(m.id))}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                                      destinoId === String(m.id)
                                        ? "border-purple-500 bg-purple-950/60"
                                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                                    }`}>
                                    <span className="text-xl shrink-0">👛</span>
                                    <span className={`text-sm font-medium flex-1 ${destinoId === String(m.id) ? "text-purple-300" : "text-slate-300"}`}>
                                      {m.display}
                                    </span>
                                    {destinoId === String(m.id) && <HiCheck className="w-4 h-4 text-purple-400 shrink-0" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Otra */}
                          <button type="button" onClick={() => setDestinoId("_otra_")}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                              destinoEsOtra ? "border-amber-500 bg-amber-950/40" : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                            }`}>
                            <span className="text-xl shrink-0">✏️</span>
                            <span className={`text-sm font-medium flex-1 ${destinoEsOtra ? "text-amber-300" : "text-slate-400"}`}>Otra…</span>
                          </button>

                          {destinoEsOtra && (
                            <input type="text" value={destinoOtra} onChange={e => setDestinoOtra(e.target.value)}
                              placeholder="Nombre de la cuenta o billetera"
                              className="w-full px-4 py-3 rounded-xl bg-slate-900 border-2 border-amber-500/60 focus:border-amber-500 text-sm text-slate-200 outline-none transition-colors" />
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* ── PASO 3: Enviado por ── */}
                    {step === 3 && (
                      <motion.div key="step3" variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.18 }}
                        className="flex-1 flex flex-col gap-3 py-4">
                        <p className="text-sm font-semibold text-slate-300 text-center mb-1">Datos del remitente</p>
                        <p className="text-[11px] text-slate-500 text-center -mt-1 mb-2">Copiá del comprobante de transferencia</p>

                        <div className="bg-amber-950/40 border border-amber-800/50 rounded-2xl p-4 space-y-4">

                          {/* Nombre */}
                          <div>
                            <label className="flex items-center gap-1.5 text-xs text-amber-500 font-bold uppercase tracking-wider mb-1.5">
                              👤 Nombre del remitente <span className="text-rose-400">*</span>
                            </label>
                            <input type="text" value={enviadoPor} onChange={e => setEnviadoPor(e.target.value)}
                              placeholder="Ej: Williams Javier Coronel"
                              className="w-full px-3 py-2.5 rounded-xl bg-slate-900/80 border border-amber-700/40 focus:border-amber-500 text-sm text-amber-100 placeholder:text-slate-600 outline-none transition-colors" />
                            {clienteNombreApellido && enviadoPor !== clienteNombreApellido && (
                              <button type="button" onClick={() => setEnviadoPor(clienteNombreApellido)}
                                className="mt-1 text-[11px] text-amber-600 hover:text-amber-400 transition-colors">
                                ↩ Usar nombre del asegurado ({clienteNombreApellido})
                              </button>
                            )}
                          </div>

                          {/* CUIT/CUIL */}
                          <div>
                            <label className="flex items-center gap-1.5 text-xs text-amber-500 font-bold uppercase tracking-wider mb-1.5">
                              🪪 CUIT / CUIL <span className="text-rose-400">*</span>
                            </label>
                            <input type="text" inputMode="numeric" value={cuitRemitente}
                              onChange={e => setCuitRemitente(e.target.value)}
                              placeholder="Ej: 20-38721209-5"
                              className="w-full px-3 py-2.5 rounded-xl bg-slate-900/80 border border-amber-700/40 focus:border-amber-500 text-sm text-amber-100 placeholder:text-slate-600 outline-none transition-colors font-mono" />
                          </div>

                        </div>

                        {/* Indicador de campos faltantes */}
                        {(!enviadoPor.trim() || !cuitRemitente.trim()) && (
                          <p className="text-[11px] text-slate-500 text-center">
                            Todos los campos son obligatorios para transferencias
                          </p>
                        )}
                      </motion.div>
                    )}

                    {/* ── PASO 4: Monto + confirmar ── */}
                    {step === 4 && (
                      <motion.div key="step4" variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.18 }}
                        className="flex-1 flex flex-col gap-4 py-4">

                        {/* Resumen de lo elegido */}
                        {needsDestino && (
                          <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 space-y-1.5">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-lg shrink-0">🏦</span>
                              <span className="text-slate-300 font-medium truncate">
                                {medios.find(m => m.id === destinoId)?.display || destinoOtra || destinoId || "—"}
                              </span>
                            </div>
                            {enviadoPor && (
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>👤</span>
                                <span>{enviadoPor}</span>
                                {cuitRemitente && <span className="font-mono text-slate-600">· {cuitRemitente}</span>}
                              </div>
                            )}
                            {nroOperacion && (
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>🔢</span>
                                <span className="font-mono">Op: {nroOperacion}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Monto */}
                        <div className="bg-pink-950/40 border border-pink-800/50 rounded-2xl p-4">
                          <p className="text-xs text-pink-500 font-bold uppercase tracking-wider mb-3">
                            💸 Monto a pagar
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-pink-400 font-bold text-lg shrink-0">AR$</span>
                            <input ref={inputMontoRef} type="text" inputMode="decimal"
                              value={monto}
                              onChange={(e => {
                                // Solo permitir números, coma y punto
                                const raw = e.target.value.replace(/[^\d.,]/g, "");
                                setMonto(raw);
                              })}
                              onBlur={(e => {
                                // Al salir del campo, formatear con separador de miles
                                const n = Number.parseFloat(String(monto).replace(/\./g, "").replace(",", "."));
                                if (Number.isFinite(n) && n > 0) {
                                  setMonto(n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }));
                                }
                              })}
                              onFocus={(e => {
                                // Al entrar al campo, mostrar número limpio para editar
                                const n = Number.parseFloat(String(monto).replace(/\./g, "").replace(",", "."));
                                if (Number.isFinite(n)) setMonto(String(n));
                              })}
                              placeholder={defaultMonto ? Number(defaultMonto).toLocaleString("es-AR") : "0"}
                              className="flex-1 bg-transparent text-3xl font-bold text-pink-200 placeholder:text-pink-900 outline-none border-b-2 pb-1 transition-colors border-pink-700/50 focus:border-pink-500" />
                          </div>
                        </div>

                        {/* 🆕 Quién cobra */}
                        <div>
                          <label className="block text-xs text-slate-400 font-medium mb-1.5">
                            <HiUser className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                            Responsable (quién cobra) *
                          </label>
                          <select
                            value={responsableId}
                            onChange={(e) => setResponsableId(e.target.value)}
                            disabled={empleadosLoading}
                            className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 outline-none focus:border-pink-500 transition-colors disabled:opacity-50"
                          >
                            <option value="">
                              {empleadosLoading ? "Cargando…" : "— Elegir —"}
                            </option>
                            {empleados.map((e) => (
                              <option key={e.id} value={e.id}>{e.nombre}</option>
                            ))}
                          </select>
                        </div>

                        {/* Fecha y observaciones */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slate-400 font-medium mb-1.5">
                              <HiCalendar className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                              Fecha de pago
                            </label>
                            <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)}
                              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 outline-none focus:border-pink-500 transition-colors" />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 font-medium mb-1.5">
                              <HiPencil className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                              Observaciones
                            </label>
                            <input type="text" value={observaciones} onChange={e => setObservaciones(e.target.value)}
                              placeholder="Referencia, nº comprobante…"
                              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-pink-500 transition-colors" />
                          </div>
                        </div>
                      </motion.div>
                    )}

                  </AnimatePresence>

                  {/* ── Botones de navegación ── */}
                  <div className="flex items-center justify-between gap-3 pt-3 mt-auto border-t border-slate-800/60">
                    {step > 1 ? (
                      <button type="button" onClick={back}
                        className="flex items-center gap-1.5 h-10 px-4 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-sm font-medium transition-colors">
                        <HiChevronLeft className="w-4 h-4" /> Atrás
                      </button>
                    ) : (
                      <button type="button" onClick={onClose}
                        className="h-10 px-4 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-400 text-sm font-medium transition-colors">
                        Cancelar
                      </button>
                    )}

                    {step < 4 ? (
                      <motion.button type="button" onClick={next} disabled={!canNext}
                        whileHover={canNext ? { scale: 1.02 } : {}}
                        whileTap={canNext ? { scale: 0.98 } : {}}
                        className={`flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold transition-all ${
                          canNext
                            ? step === 1
                              ? metodo === "efectivo"
                                ? "bg-emerald-500 hover:bg-emerald-400 text-white"
                                : "bg-sky-500 hover:bg-sky-400 text-white"
                              : step === 2
                              ? "bg-sky-500 hover:bg-sky-400 text-white"
                              : "bg-amber-500 hover:bg-amber-400 text-white"
                            : "bg-slate-800 text-slate-600 cursor-not-allowed"
                        }`}>
                        Siguiente <HiArrowRight className="w-4 h-4" />
                      </motion.button>
                    ) : (
                      <motion.button type="button" onClick={confirm}
                        disabled={!canNext || submitting}
                        whileHover={canNext ? { scale: 1.02 } : {}}
                        whileTap={canNext ? { scale: 0.98 } : {}}
                        className={`flex items-center gap-2 h-10 px-6 rounded-xl text-sm font-bold transition-all ${
                          canNext && !submitting
                            ? "bg-pink-600 hover:bg-pink-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.3)]"
                            : "bg-slate-800 text-slate-600 cursor-not-allowed"
                        }`}>
                        {submitting
                          ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Confirmando…</>
                          : <><span>🤑</span> Confirmar pago</>
                        }
                      </motion.button>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}