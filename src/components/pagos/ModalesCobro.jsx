// src/components/pagos/ModalesCobro.jsx — diseño Duo (claro/oscuro)
// ─────────────────────────────────────────────────────────────
// ARCHIVO UNIFICADO — reemplaza a estos 3 archivos:
//   · ModalFormaPago.jsx        → export { ModalFormaPago }  (y default)
//   · ConfirmarPagoModal.jsx    → export { ConfirmarPagoModal }
//   · RegistrarTraspasoModal.jsx→ export { RegistrarTraspasoModal }
//
// Se usan igual que antes, solo cambia el import:
//   import ModalFormaPago, {
//     ConfirmarPagoModal, RegistrarTraspasoModal
//   } from "./ModalesCobro";
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { createPortal } from "react-dom";
import { Dialog, Transition } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiX, HiCalendar, HiPencil, HiChevronLeft, HiCheck, HiUser, HiArrowRight,
  HiCash, HiSparkles, HiCamera, HiOutlineSwitchHorizontal,
  HiClock, HiCurrencyDollar,
} from "react-icons/hi";
import toast from "react-hot-toast";
import { sendAdminPagoRegistrado } from "../../services/notifications/pagos";
import { solicitudesApi } from "../../services/solicitudes.js";

/* ═══════════════════════════════════════════════════════════════════
   1) ModalFormaPago — Wizard de pago (efectivo / transferencia)
      1 → Método · 2 → Billetera · 3 → Enviado por · 4 → Monto
═══════════════════════════════════════════════════════════════════ */
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

export function ModalFormaPago({
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
  const [monto,        setMonto]        = useState("");
  const [fechaPago,    setFechaPago]    = useState(getLocalISODate());
  const [observaciones,setObservaciones]= useState("");
  const [submitting,   setSubmitting]   = useState(false);
  // 🆕 Quién cobra
  const [responsableId, setResponsableId] = useState("");
  const [empleados, setEmpleados] = useState([]);
  const [empleadosLoading, setEmpleadosLoading] = useState(false);

  const inputMontoRef = useRef(null);

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

  /* ── Validaciones por paso ── */
  const montoNum = useMemo(() => {
    const clean = String(monto)
      .replace(/\./g, "")
      .replace(",", ".");
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
  }, [step, destinoId, destinoEsOtra, destinoOtra, enviadoPor, cuitRemitente, montoNum, fechaPago, responsableId]);

  /* ── Navegación ── */
  const secuencia = metodo === "efectivo" ? [1, 4] : [1, 2, 3, 4];

  const next = () => {
    const pos = secuencia.indexOf(step);
    if (pos < 0 || pos >= secuencia.length - 1) return;
    const proximo = secuencia[pos + 1];
    setStep(proximo);
    if (proximo === 4) setTimeout(() => inputMontoRef.current?.focus(), 50);
  };

  const back = () => {
    const pos = secuencia.indexOf(step);
    if (pos > 0) setStep(secuencia[pos - 1]);
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

      const obsPartes = [];
      if (observaciones.trim()) obsPartes.push(observaciones.trim());
      if (needsDestino && cuitRemitente.trim()) {
        obsPartes.push(`CUIT: ${cuitRemitente.trim()}`);
      }

      const payload = {
        metodo, forma_pago: metodo,
        monto: Number(montoNum.toFixed(2)),
        fecha_pago: fechaPago,
        observaciones: obsPartes.join(" | ") || undefined,
        enviado_por: enviadoPor.trim() || undefined,
        cuit_remitente: needsDestino ? cuitRemitente.trim() || undefined : undefined,
        destino_cuenta: needsDestino ? destino : undefined,
        medio_cobro_id: medioSeleccionado ? Number(medioSeleccionado.id) : undefined,
        destino_tipo: medioSeleccionado?.proveedor,
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment}
              enter="ease-out duration-200" enterFrom="opacity-0 translate-y-3 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-3 scale-95">

              <Dialog.Panel className="w-full max-w-md overflow-hidden rounded-3xl bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark shadow-2xl text-titulo dark:text-titulo-dark">

                {/* Header */}
                <div className="px-5 py-4 border-b-2 border-linea dark:border-linea-dark flex items-center justify-between">
                  <div>
                    <Dialog.Title className="text-base font-black text-titulo dark:text-titulo-dark">
                      🤑 {title}
                    </Dialog.Title>
                    <p className="text-xs text-suave dark:text-suave-dark mt-0.5 font-bold">
                      {clienteNombreApellido && <span>{clienteNombreApellido}</span>}
                      {pagoCuota && <span> · Cuota #{pagoCuota}</span>}
                    </p>
                  </div>
                  <button onClick={onClose} className="h-8 w-8 rounded-xl flex items-center justify-center text-suave dark:text-suave-dark hover:brightness-95 bg-surface dark:bg-surface-dark transition-colors">
                    <HiX className="w-5 h-5" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="px-5 pt-4 pb-2">
                  <div className="flex items-center gap-1.5">
                    {stepLabels.map((label, i) => {
                      const done    = i < stepIndex;
                      const active  = i === stepIndex;
                      return (
                        <div key={label} className="flex-1 flex flex-col items-center gap-1">
                          <div className={`h-2.5 w-full rounded-full transition-all duration-300 ${
                            done || active ? "bg-duo-azul" : "bg-linea dark:bg-linea-dark"
                          }`} />
                          <span className={`text-[10px] font-black transition-colors ${
                            done || active ? "text-duo-azul" : "text-suave dark:text-suave-dark"
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
                        <p className="text-sm font-black text-titulo dark:text-titulo-dark text-center mb-2">¿Cómo paga el cliente?</p>
                        <div className="grid grid-cols-2 gap-3">
                          {/* Efectivo */}
                          <button type="button" onClick={() => setMetodo("efectivo")}
                            className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-150 ${
                              metodo === "efectivo"
                                ? "border-duo-verde bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)]"
                                : "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:border-duo-verde"
                            }`}>
                            <div className="h-14 w-14 rounded-2xl bg-card dark:bg-card-dark flex items-center justify-center text-3xl">
                              💵
                            </div>
                            <div className="text-center">
                              <div className={`text-sm font-black ${metodo === "efectivo" ? "text-duo-verde-sombra dark:text-duo-verde" : "text-titulo dark:text-titulo-dark"}`}>
                                Efectivo
                              </div>
                              <div className="text-[11px] text-suave dark:text-suave-dark font-bold mt-0.5">Pago en mano</div>
                            </div>
                            {metodo === "efectivo" && (
                              <div className="h-5 w-5 rounded-full bg-duo-verde flex items-center justify-center">
                                <HiCheck className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>

                          {/* Transferencia */}
                          <button type="button" onClick={() => setMetodo("transferencia")}
                            className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-150 ${
                              metodo === "transferencia"
                                ? "border-duo-azul bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)]"
                                : "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:border-duo-azul"
                            }`}>
                            <div className="h-14 w-14 rounded-2xl bg-card dark:bg-card-dark flex items-center justify-center text-3xl">
                              🏦
                            </div>
                            <div className="text-center">
                              <div className={`text-sm font-black ${metodo === "transferencia" ? "text-duo-azul" : "text-titulo dark:text-titulo-dark"}`}>
                                Transferencia
                              </div>
                              <div className="text-[11px] text-suave dark:text-suave-dark font-bold mt-0.5">MP / Bancaria</div>
                            </div>
                            {metodo === "transferencia" && (
                              <div className="h-5 w-5 rounded-full bg-duo-azul flex items-center justify-center">
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
                        <p className="text-sm font-black text-titulo dark:text-titulo-dark text-center mb-2">¿A qué cuenta llegó la plata?</p>

                        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                          {/* Mercado Pago */}
                          {(mediosMP.length > 0 || mpStrings.length > 0) && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-duo-azul font-black mb-1.5 px-1">Mercado Pago</p>
                              <div className="space-y-1.5">
                                {(mediosMP.length > 0 ? mediosMP : mpStrings.map((s, i) => ({ id: `mp-${i}`, display: s, proveedor: "mercado_pago" }))).map(m => (
                                  <button key={m.id} type="button" onClick={() => setDestinoId(String(m.id))}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                                      destinoId === String(m.id)
                                        ? "border-duo-azul bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)]"
                                        : "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:border-duo-azul"
                                    }`}>
                                    <span className="text-xl shrink-0">💳</span>
                                    <span className={`text-sm font-bold flex-1 ${destinoId === String(m.id) ? "text-duo-azul" : "text-titulo dark:text-titulo-dark"}`}>
                                      {m.display}
                                    </span>
                                    {destinoId === String(m.id) && <HiCheck className="w-4 h-4 text-duo-azul shrink-0" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Billeteras virtuales */}
                          {(mediosBil.length > 0 || bilStrings.length > 0) && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-duo-violeta font-black mb-1.5 px-1">Billeteras virtuales</p>
                              <div className="space-y-1.5">
                                {(mediosBil.length > 0 ? mediosBil : bilStrings.map((s, i) => ({ id: `bil-${i}`, display: s }))).map(m => (
                                  <button key={m.id} type="button" onClick={() => setDestinoId(String(m.id))}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                                      destinoId === String(m.id)
                                        ? "border-duo-violeta bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)]"
                                        : "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:border-duo-violeta"
                                    }`}>
                                    <span className="text-xl shrink-0">👛</span>
                                    <span className={`text-sm font-bold flex-1 ${destinoId === String(m.id) ? "text-duo-violeta" : "text-titulo dark:text-titulo-dark"}`}>
                                      {m.display}
                                    </span>
                                    {destinoId === String(m.id) && <HiCheck className="w-4 h-4 text-duo-violeta shrink-0" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Otra */}
                          <button type="button" onClick={() => setDestinoId("_otra_")}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                              destinoEsOtra ? "border-duo-amarillo bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)]" : "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:border-duo-amarillo"
                            }`}>
                            <span className="text-xl shrink-0">✏️</span>
                            <span className={`text-sm font-bold flex-1 ${destinoEsOtra ? "text-duo-amarillo-sombra dark:text-duo-amarillo" : "text-suave dark:text-suave-dark"}`}>Otra…</span>
                          </button>

                          {destinoEsOtra && (
                            <input type="text" value={destinoOtra} onChange={e => setDestinoOtra(e.target.value)}
                              placeholder="Nombre de la cuenta o billetera"
                              className="w-full px-4 py-3 rounded-xl bg-surface dark:bg-surface-dark border-2 border-duo-amarillo/60 focus:border-duo-amarillo text-sm font-bold text-titulo dark:text-titulo-dark outline-none transition-colors" />
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
                        <p className="text-sm font-black text-titulo dark:text-titulo-dark text-center mb-1">Datos del remitente</p>
                        <p className="text-[11px] text-suave dark:text-suave-dark text-center -mt-1 mb-2 font-bold">Copiá del comprobante de transferencia</p>

                        <div className="bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] border-2 border-duo-amarillo/50 rounded-2xl p-4 space-y-4">

                          {/* Nombre */}
                          <div>
                            <label className="flex items-center gap-1.5 text-xs text-duo-amarillo-sombra dark:text-duo-amarillo font-black uppercase tracking-wide mb-1.5">
                              👤 Nombre del remitente <span className="text-duo-rojo">*</span>
                            </label>
                            <input type="text" value={enviadoPor} onChange={e => setEnviadoPor(e.target.value)}
                              placeholder="Ej: Williams Javier Coronel"
                              className="w-full px-3 py-2.5 rounded-xl bg-card dark:bg-card-dark border-2 border-duo-amarillo/40 focus:border-duo-amarillo text-sm font-bold text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none transition-colors" />
                            {clienteNombreApellido && enviadoPor !== clienteNombreApellido && (
                              <button type="button" onClick={() => setEnviadoPor(clienteNombreApellido)}
                                className="mt-1 text-[11px] font-bold text-duo-amarillo-sombra dark:text-duo-amarillo hover:brightness-110 transition-colors">
                                ↩ Usar nombre del asegurado ({clienteNombreApellido})
                              </button>
                            )}
                          </div>

                          {/* CUIT/CUIL */}
                          <div>
                            <label className="flex items-center gap-1.5 text-xs text-duo-amarillo-sombra dark:text-duo-amarillo font-black uppercase tracking-wide mb-1.5">
                              🪪 CUIT / CUIL <span className="text-duo-rojo">*</span>
                            </label>
                            <input type="text" inputMode="numeric" value={cuitRemitente}
                              onChange={e => setCuitRemitente(e.target.value)}
                              placeholder="Ej: 20-38721209-5"
                              className="w-full px-3 py-2.5 rounded-xl bg-card dark:bg-card-dark border-2 border-duo-amarillo/40 focus:border-duo-amarillo text-sm font-bold text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none transition-colors font-mono" />
                          </div>

                        </div>

                        {(!enviadoPor.trim() || !cuitRemitente.trim()) && (
                          <p className="text-[11px] text-suave dark:text-suave-dark text-center font-bold">
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
                          <div className="bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark rounded-xl px-4 py-3 space-y-1.5">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-lg shrink-0">🏦</span>
                              <span className="text-titulo dark:text-titulo-dark font-bold truncate">
                                {medios.find(m => m.id === destinoId)?.display || destinoOtra || destinoId || "—"}
                              </span>
                            </div>
                            {enviadoPor && (
                              <div className="flex items-center gap-2 text-xs text-suave dark:text-suave-dark font-bold">
                                <span>👤</span>
                                <span>{enviadoPor}</span>
                                {cuitRemitente && <span className="font-mono">· {cuitRemitente}</span>}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Monto */}
                        <div className="bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] border-2 border-duo-verde/50 rounded-2xl p-4">
                          <p className="text-xs text-duo-verde-sombra dark:text-duo-verde font-black uppercase tracking-wide mb-3">
                            💸 Monto a pagar
                          </p>
                          {/* Campo redondo contenido: la caja blanca envuelve AR$ + el número,
                              así el borde ya NO se desborda de la tarjeta verde. */}
                          <div className="flex items-center gap-2 w-full bg-card dark:bg-card-dark border-2 border-duo-verde/40 focus-within:border-duo-verde rounded-xl px-3 py-2 transition-colors">
                            <span className="text-duo-verde-sombra dark:text-duo-verde font-black text-lg shrink-0">AR$</span>
                            <input ref={inputMontoRef} type="text" inputMode="decimal"
                              value={monto}
                              onChange={(e => {
                                const raw = e.target.value.replace(/[^\d.,]/g, "");
                                setMonto(raw);
                              })}
                              onBlur={(e => {
                                const n = Number.parseFloat(String(monto).replace(/\./g, "").replace(",", "."));
                                if (Number.isFinite(n) && n > 0) {
                                  setMonto(n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }));
                                }
                              })}
                              onFocus={(e => {
                                const n = Number.parseFloat(String(monto).replace(/\./g, "").replace(",", "."));
                                if (Number.isFinite(n)) setMonto(String(n));
                              })}
                              placeholder={defaultMonto ? Number(defaultMonto).toLocaleString("es-AR") : "0"}
                              className="flex-1 min-w-0 bg-transparent text-3xl font-black text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none" />
                          </div>
                        </div>

                        {/* 🆕 Quién cobra */}
                        <div>
                          <label className="block text-xs text-suave dark:text-suave-dark font-black mb-1.5 uppercase tracking-wide">
                            <HiUser className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                            Responsable (quién cobra) *
                          </label>
                          <select
                            value={responsableId}
                            onChange={(e) => setResponsableId(e.target.value)}
                            disabled={empleadosLoading}
                            className="w-full h-11 px-3 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark text-sm font-bold text-titulo dark:text-titulo-dark outline-none focus:border-duo-verde transition-colors disabled:opacity-50 dark:[color-scheme:dark] cursor-pointer"
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
                            <label className="block text-xs text-suave dark:text-suave-dark font-black mb-1.5 uppercase tracking-wide">
                              <HiCalendar className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                              Fecha de pago
                            </label>
                            <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)}
                              className="w-full h-11 px-3 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark text-sm font-bold text-titulo dark:text-titulo-dark outline-none focus:border-duo-verde transition-colors dark:[color-scheme:dark]" />
                          </div>
                          <div>
                            <label className="block text-xs text-suave dark:text-suave-dark font-black mb-1.5 uppercase tracking-wide">
                              <HiPencil className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                              Observaciones
                            </label>
                            <input type="text" value={observaciones} onChange={e => setObservaciones(e.target.value)}
                              placeholder="Referencia, nº comprobante…"
                              className="w-full h-11 px-3 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark text-sm font-bold text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-duo-verde transition-colors" />
                          </div>
                        </div>
                      </motion.div>
                    )}

                  </AnimatePresence>

                  {/* ── Botones de navegación ── */}
                  <div className="flex items-center justify-between gap-3 pt-3 mt-auto border-t-2 border-linea dark:border-linea-dark">
                    {step > 1 ? (
                      <button type="button" onClick={back}
                        className="flex items-center gap-1.5 h-11 px-4 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:brightness-95 text-titulo dark:text-titulo-dark text-sm font-black transition-colors">
                        <HiChevronLeft className="w-4 h-4" /> Atrás
                      </button>
                    ) : (
                      <button type="button" onClick={onClose}
                        className="h-11 px-4 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:brightness-95 text-suave dark:text-suave-dark text-sm font-black transition-colors">
                        Cancelar
                      </button>
                    )}

                    {step < 4 ? (
                      <button type="button" onClick={next} disabled={!canNext}
                        className={`flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-black transition-all ${
                          canNext
                            ? "bg-duo-azul text-white shadow-[0_4px_0_var(--color-duo-azul-sombra)] active:shadow-[0_0_0_var(--color-duo-azul-sombra)] active:translate-y-0.5"
                            : "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark cursor-not-allowed"
                        }`}>
                        Siguiente <HiArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button type="button" onClick={confirm}
                        disabled={!canNext || submitting}
                        className={`flex items-center gap-2 h-11 px-6 rounded-xl text-sm font-black transition-all ${
                          canNext && !submitting
                            ? "bg-duo-verde text-white shadow-[0_4px_0_var(--color-duo-verde-sombra)] active:shadow-[0_0_0_var(--color-duo-verde-sombra)] active:translate-y-0.5"
                            : "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark cursor-not-allowed"
                        }`}>
                        {submitting
                          ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Confirmando…</>
                          : <><span>🤑</span> Confirmar pago</>
                        }
                      </button>
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

/* ═══════════════════════════════════════════════════════════════════
   2) ConfirmarPagoModal — resumen final + advertencias de riesgo
═══════════════════════════════════════════════════════════════════ */
const MONEY_FMT_CONF = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const fmtMoneyConf = (n) => MONEY_FMT_CONF.format(Number(n || 0));

export function ConfirmarPagoModal({
  isOpen,
  confirmData,
  confirmandoPago,
  onClose,
  onConfirm,
  isWebAdmin,
}) {
  const [cuponeraSubida, setCuponeraSubida] = useState(false);

  useEffect(() => {
    if (isOpen) setCuponeraSubida(false);
  }, [isOpen]);

  if (!isOpen || !confirmData) return null;

  const da = confirmData.diasAtraso || 0;
  const isCancelada = confirmData.polizaEstado === "CANCELADA" || confirmData.polizaEstado === "ANULADA";

  const cobNormalizada = String(confirmData.polizaCobertura || "").trim().toUpperCase();

  const isCoberturaA =
    cobNormalizada === "A" ||
    cobNormalizada === "COBERTURA A" ||
    cobNormalizada === "RC" ||
    cobNormalizada.includes("RESPONSABILIDAD CIVIL");

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

  // Borde del modal según nivel de riesgo (tokens Duo)
  let modalBorde = "border-linea dark:border-linea-dark";
  if (isCancelada || da >= 15) modalBorde = "border-duo-rojo";
  else if (da >= 4) modalBorde = "border-duo-amarillo";
  else if (da >= 1) modalBorde = "border-duo-amarillo/60";

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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={confirmandoPago ? undefined : onClose}
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className={`relative z-[66] w-full max-w-2xl rounded-3xl border-2 px-6 py-6 shadow-2xl bg-card dark:bg-card-dark ${modalBorde} max-h-[95vh] overflow-y-auto custom-scrollbar`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-xl font-black text-titulo dark:text-titulo-dark">Confirmar pago</h3>
              <button
                onClick={onClose}
                disabled={confirmandoPago}
                className="h-9 w-9 sm:w-auto sm:px-3 rounded-xl border-2 border-linea dark:border-linea-dark flex items-center justify-center cursor-pointer transition-colors bg-surface dark:bg-surface-dark hover:brightness-95 text-titulo dark:text-titulo-dark disabled:opacity-50"
              >
                <HiX className="w-5 h-5" />
                <span className="hidden sm:inline ml-1 text-sm font-black">Cancelar</span>
              </button>
            </div>

            {/* 🚨 ADVERTENCIAS DE RIESGO */}
            {isCancelada && (
              <div className="mb-4 p-3 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] border-2 border-duo-rojo rounded-2xl text-titulo dark:text-titulo-dark text-sm font-bold">
                ⚠️ <strong>PÓLIZA DADA DE BAJA:</strong> Estás a punto de cobrar una cuota de una póliza cancelada. Esto se registrará como <b>recupero de deuda</b>.
              </div>
            )}

            {!isCancelada && da >= 15 && (
              <div className="mb-4 p-4 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] border-2 border-duo-rojo rounded-2xl text-titulo dark:text-titulo-dark text-sm">
                <div className="font-black text-xl mb-3 text-duo-rojo">🚨 PELIGRO: ATRASO DE {da} DÍAS</div>
                <ul className="list-disc pl-5 font-black space-y-2 text-base">
                  <li>VERIFICAR QUE LA PÓLIZA NO ESTÉ DADA DE BAJA EN LA COMPAÑÍA.</li>
                  <li>PREGUNTAR Y REVISAR SI TIENE O TUVO ALGÚN SINIESTRO.</li>
                </ul>
              </div>
            )}

            {!isCancelada && da >= 4 && da <= 14 && (
              <div className="mb-4 p-4 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] border-2 border-duo-amarillo rounded-2xl text-titulo dark:text-titulo-dark text-sm">
                <div className="font-black text-xl mb-3 text-duo-amarillo-sombra dark:text-duo-amarillo">⚠️ ATENCIÓN: ATRASO DE {da} DÍAS</div>
                <ul className="list-disc pl-5 font-black space-y-2 text-base">
                  <li>VERIFICAR QUE LA PÓLIZA NO ESTÉ DADA DE BAJA EN LA COMPAÑÍA.</li>
                  <li>PREGUNTAR Y REVISAR SI TIENE O TUVO ALGÚN SINIESTRO.</li>
                </ul>
              </div>
            )}

            {!isCancelada && da >= 1 && da <= 3 && (
              <div className="mb-4 p-3 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] border-2 border-duo-amarillo/60 rounded-2xl text-titulo dark:text-titulo-dark text-sm">
                <div className="font-black text-lg mb-2 text-duo-amarillo-sombra dark:text-duo-amarillo">👀 PRECAUCIÓN: {da} {da === 1 ? 'DÍA' : 'DÍAS'} DE ATRASO</div>
                <ul className="list-disc pl-5 font-bold text-sm space-y-1.5">
                  <li>Preguntar y revisar si tiene o tuvo algún siniestro.</li>
                </ul>
              </div>
            )}

            {/* 📸 VALIDACIÓN DE CUPONERA */}
            {tieneRobo && (
              <div className="mb-4 p-4 bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] border-2 border-duo-azul rounded-2xl text-titulo dark:text-titulo-dark text-sm">
                <div className="flex items-center gap-2 font-black text-base mb-2">
                  <HiCamera className="w-5 h-5 text-duo-azul" />
                  SEGURO CON ROBO
                </div>
                <p className="mb-3 text-[13px] leading-relaxed font-bold">
                  Estás por cobrar un seguro que incluye Robo. <strong>Tenés que pagar la cuponera y subir el comprobante</strong> para poder continuar.
                </p>
                <label className="flex items-center gap-3 cursor-pointer bg-card dark:bg-card-dark hover:brightness-95 transition-colors p-3 rounded-xl border-2 border-duo-azul/40">
                  <input
                    type="checkbox"
                    checked={cuponeraSubida}
                    onChange={(e) => setCuponeraSubida(e.target.checked)}
                    className="w-5 h-5 accent-duo-azul cursor-pointer rounded"
                  />
                  <span className="font-black text-[13px]">Ya pagué y subí la cuponera.</span>
                </label>
              </div>
            )}

            {/* CONTENIDO DEL PAGO */}
            <div className="space-y-3 p-4 rounded-2xl border-2 bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark">
              <p className="text-sm font-bold text-titulo dark:text-titulo-dark">
                Vas a pagar la cuota <span className="font-black text-duo-verde">#{confirmData.cuotaNro ?? "?"}</span> de la póliza <span className="font-black text-titulo dark:text-titulo-dark">{confirmData.numeroPoliza}</span>.
              </p>

              {isWebAdmin && confirmData.oficinaLabel && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wide bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde">
                   🏢 Oficina: {confirmData.oficinaLabel}
                </div>
              )}

              <div className="mt-2 text-center">
                <p className="text-xs uppercase tracking-wide mb-2 font-black text-suave dark:text-suave-dark">Importe a pagar</p>
                <p className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-duo-verde">
                  $ {fmtMoneyConf(confirmData.monto)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={onClose}
                disabled={confirmandoPago}
                className="h-12 px-6 rounded-xl border-2 text-base font-black cursor-pointer transition-colors bg-surface dark:bg-surface-dark hover:brightness-95 border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark disabled:opacity-50"
              >
                Corregir
              </button>
              <button
                onClick={onConfirm}
                disabled={botonBloqueado}
                className={`h-12 px-6 rounded-xl font-black text-base flex items-center justify-center gap-2 transition-all ${
                  botonBloqueado
                    ? "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark cursor-not-allowed"
                    : "bg-duo-verde text-white shadow-[0_5px_0_var(--color-duo-verde-sombra)] active:shadow-[0_0_0_var(--color-duo-verde-sombra)] active:translate-y-0.5 cursor-pointer"
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

/* ═══════════════════════════════════════════════════════════════════
   4) RegistrarTraspasoModal — cierre de venta / traspaso de cartera
═══════════════════════════════════════════════════════════════════ */
const MONEY_FMT_TRAS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
});

const VENDEDORES_MOCK = [
  { id: 1, nombre: "Rita" },
  { id: 2, nombre: "Carlos" },
  { id: 3, nombre: "Matias" },
  { id: 4, nombre: "Vendedor Extra" },
];

export function RegistrarTraspasoModal({ isOpen, onClose, clienteData }) {
  const [vendedor, setVendedor] = useState("");
  const [companiaDestino, setCompaniaDestino] = useState("");
  const [coberturaDestino, setCoberturaDestino] = useState("");

  const [costoTecnico, setCostoTecnico] = useState("");
  const [precioCobrado, setPrecioCobrado] = useState("");

  const [comisionCalculada, setComisionCalculada] = useState(0);

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
      style: { background: '#58cc02', color: '#fff', fontWeight: 'bold' }
    });
    onClose();
  };

  const handleOportunidad = () => {
    if (!validarFormulario()) return;
    toast("Oportunidad Reservada por 15 días ⏳", {
      icon: '🤔',
      style: { background: '#ffc800', color: '#3c3c3c', fontWeight: 'bold' }
    });
    onClose();
  };

  const selCls = "w-full rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-4 py-3 text-sm font-bold text-titulo dark:text-titulo-dark focus:border-duo-violeta focus:outline-none dark:[color-scheme:dark] cursor-pointer";

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onClose}>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md overflow-hidden rounded-3xl border-2 border-duo-violeta/50 bg-card dark:bg-card-dark shadow-2xl transition-all">

              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta">
                    <HiOutlineSwitchHorizontal className="text-xl" />
                  </div>
                  <div>
                    <Dialog.Title className="text-lg font-black text-titulo dark:text-titulo-dark">
                      Traspaso de Cartera
                    </Dialog.Title>
                    <p className="text-xs text-suave dark:text-suave-dark font-bold">
                      Ofreciendo a: <span className="font-black text-titulo dark:text-titulo-dark">{clienteData?.nombre || "Asegurado"}</span>
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="rounded-full p-2 text-suave dark:text-suave-dark hover:brightness-95 bg-surface dark:bg-surface-dark transition-colors cursor-pointer">
                  <HiX className="h-6 w-6" />
                </button>
              </div>

              {/* Formulario */}
              <div className="p-6 space-y-5">

                {/* 0. Vendedor */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black uppercase tracking-wide text-suave dark:text-suave-dark flex items-center gap-1.5">
                    <HiUser /> ¿Quién está atendiendo?
                  </label>
                  <select value={vendedor} onChange={(e) => setVendedor(e.target.value)} className={selCls}>
                    <option value="">Seleccionar tu nombre...</option>
                    {VENDEDORES_MOCK.map(v => (
                      <option key={v.id} value={v.id}>{v.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* 1. Compañía Destino */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-wide font-black text-suave dark:text-suave-dark">Pasar a Compañía</label>
                    <select
                      value={companiaDestino}
                      onChange={(e) => { setCompaniaDestino(e.target.value); setCoberturaDestino(""); }}
                      className={selCls}
                    >
                      <option value="">Cía...</option>
                      <option value="PROF">PROF</option>
                      <option value="AMCA">AMCA</option>
                    </select>
                  </div>

                  {/* 2. Cobertura Destino */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-wide font-black text-suave dark:text-suave-dark">Cobertura</label>
                    <select
                      value={coberturaDestino}
                      onChange={(e) => setCoberturaDestino(e.target.value)}
                      disabled={!companiaDestino}
                      className={`${selCls} disabled:opacity-50`}
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
                      className="rounded-2xl border-2 border-duo-azul/50 bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] p-3 text-titulo dark:text-titulo-dark text-xs"
                    >
                      <div className="flex items-center gap-1.5 font-black mb-1">
                        <HiCamera className="text-duo-azul text-base" /> ¡OBLIGATORIO!
                      </div>
                      <p className="font-bold">Para emitir el ROBO es obligatorio pedirle las <b>fotos del vehículo</b>. Anotalas en la bandeja de Emisiones.</p>
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
                        <label className="text-[10px] uppercase tracking-wide font-black text-suave dark:text-suave-dark">Costo Compañía</label>
                        <input
                          type="number" placeholder="$" value={costoTecnico}
                          onChange={(e) => setCostoTecnico(e.target.value)}
                          className="w-full rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-3 py-2.5 text-sm font-bold text-titulo dark:text-titulo-dark focus:border-duo-violeta focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase tracking-wide font-black text-duo-verde-sombra dark:text-duo-verde">Cobrado al Cliente</label>
                        <input
                          type="number" placeholder="$" value={precioCobrado}
                          onChange={(e) => setPrecioCobrado(e.target.value)}
                          className="w-full rounded-xl border-2 border-duo-verde/50 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] px-3 py-2.5 text-sm font-black text-duo-verde-sombra dark:text-duo-verde focus:border-duo-verde focus:outline-none"
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
                      className="mt-2 rounded-2xl border-2 border-duo-verde/40 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] p-5 text-center"
                    >
                      <div className="flex items-center justify-center gap-2 text-duo-verde-sombra dark:text-duo-verde mb-1">
                        <HiSparkles className="text-xl" />
                        <span className="text-xs font-black uppercase tracking-wide">Tu comisión a ganar</span>
                      </div>
                      <div className="text-4xl font-black text-duo-verde-sombra dark:text-duo-verde">
                        {MONEY_FMT_TRAS.format(comisionCalculada)}
                      </div>
                      {companiaDestino === "AMCA" && (
                        <p className="mt-1 text-[10px] text-duo-verde-sombra/80 dark:text-duo-verde/80 font-bold">
                          ($10.000 Base + {MONEY_FMT_TRAS.format(Math.max(0, precioCobrado - costoTecnico))} Sobreprecio)
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

              {/* Footer con Múltiples Acciones */}
              <div className="border-t-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4 flex flex-col gap-3">
                <button
                  onClick={handleRegistrar}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-duo-verde px-5 py-3.5 text-sm font-black text-white shadow-[0_5px_0_var(--color-duo-verde-sombra)] active:shadow-[0_0_0_var(--color-duo-verde-sombra)] active:translate-y-0.5 transition-all"
                >
                  <HiCurrencyDollar className="text-xl" /> ¡Lo Vendí! Registrar Traspaso
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-4 py-2.5 text-xs font-black text-titulo dark:text-titulo-dark hover:brightness-95 transition-colors"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={handleOportunidad}
                    className="flex-[2] flex items-center justify-center gap-1.5 rounded-xl border-2 border-duo-amarillo/50 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] px-4 py-2.5 text-xs font-black text-duo-amarillo-sombra dark:text-duo-amarillo hover:brightness-95 transition-colors"
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

// Export default = ModalFormaPago (el modal principal de cobro)
export default ModalFormaPago;
