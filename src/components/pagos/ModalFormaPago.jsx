/* src/components/pagos/ModalFormaPago.jsx — destino por id + email pago_destino */
import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { motion } from "framer-motion";
import {
  HiCash, HiRefresh, HiX, HiCalendar, HiPencil, HiChevronDown, HiEye, HiInformationCircle,
} from "react-icons/hi";
/* Notificación por email (con pago_destino) */
import { sendAdminPagoRegistrado } from "../../services/notifications/pagos";

export default function ModalFormaPago({
  isOpen,
  onClose,
  onConfirm,               // { metodo, forma_pago, monto, fecha_pago, observaciones, medio_cobro_id?, destino_tipo?, destino_cuenta? }
  defaultMonto,
  title = "Confirmar pago",
  cuentasMercadoPago = [], // compat legacy: strings
  billeterasVirtuales = [],// compat legacy: strings
  mediosCobro = [],        // ✅ objetos completos: {id, proveedor, etiqueta, valor, titular_nombre, activo}
  /* Datos mínimos para la notificación (se envían tal cual al template) */
  clienteNombreApellido = "",
  clienteDni = "",
  polizaCompania = "",
  polizaCobertura = "",
  pagoCuota = "",          // ej: "Cuota 3/12"
}) {
  const [metodo, setMetodo] = useState("efectivo"); // 'efectivo' | 'transferencia'
  const [monto, setMonto] = useState("");
  const [fechaPago, setFechaPago] = useState(getLocalISODate());
  const [observaciones, setObservaciones] = useState("");

  // Destino (solo para 'transferencia')
  const [destinoCuenta, setDestinoCuenta] = useState(""); // guarda el value del <select>: id numérico o "_otra_"
  const [destinoOtra, setDestinoOtra] = useState("");
  const [verOpciones, setVerOpciones] = useState(false);

  const inputMontoRef = useRef(null);

  const placeholderMonto = useMemo(() => {
    return Number.isFinite(Number(defaultMonto))
      ? String(Number(defaultMonto).toFixed(2)).replace(".", ",")
      : "0,00";
  }, [defaultMonto]);

  useEffect(() => {
    if (isOpen) {
      setMonto("");
      setFechaPago(getLocalISODate());
      setObservaciones("");
      setDestinoCuenta("");
      setDestinoOtra("");
      setVerOpciones(false);
      setTimeout(() => inputMontoRef.current?.focus(), 0);
    }
  }, [isOpen, defaultMonto]);

  const montoNumber = useMemo(() => {
    const s = String(monto ?? "").trim().replace(",", ".");
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
  }, [monto]);

  const needsDestino = metodo === "transferencia";
  const destinoEsOtra = destinoCuenta === "_otra_";

  // Normalizo medios desde Redux (si vienen)
  const medios = useMemo(() => {
    if (!Array.isArray(mediosCobro) || mediosCobro.length === 0) return [];
    return mediosCobro
      .filter((m) => m && m.activo !== false)
      .map((m) => ({
        id: m.id,
        proveedor: m.proveedor,                 // 'mercado_pago' | 'billetera_virtual'
        etiqueta: m.etiqueta || m.valor || "",
        titular: m.titular_nombre || "",
        display: `${m.titular_nombre ? m.titular_nombre + " — " : ""}${m.etiqueta || m.valor || ""}`.trim(),
      }));
  }, [mediosCobro]);

  const mediosMP = useMemo(() => medios.filter((m) => m.proveedor === "mercado_pago"), [medios]);
  const mediosBil = useMemo(() => medios.filter((m) => m.proveedor === "billetera_virtual"), [medios]);

  // Compatibilidad: si no hay medios por objetos, uso strings para mostrar (sin id)
  const mpStrings = Array.isArray(cuentasMercadoPago) ? cuentasMercadoPago : [];
  const bilStrings = Array.isArray(billeterasVirtuales) ? billeterasVirtuales : [];

  const totalMP = mediosMP.length || mpStrings.length;
  const totalBil = mediosBil.length || bilStrings.length;

  const destinoValido =
    !needsDestino ||
    ((destinoCuenta && !destinoEsOtra) || (destinoEsOtra && !!destinoOtra.trim()));

  const isValid =
    monto !== "" &&
    Number.isFinite(montoNumber) &&
    montoNumber > 0 &&
    isValidISODate(fechaPago) &&
    destinoValido;

  const buscarMedioPorId = (idStr) => {
    const id = Number(idStr);
    if (!Number.isFinite(id)) return null;
    return medios.find((m) => m.id === id) || null;
  };

  const confirm = async () => {
    if (!isValid) return;

    const payload = {
      metodo,
      forma_pago: metodo, // backend usa los mismos 2 valores
      monto: Number(montoNumber.toFixed(2)),
      fecha_pago: fechaPago,
      observaciones: observaciones?.trim() || undefined,
    };

    let pago_destino = ""; // para email

    if (needsDestino) {
      if (!destinoEsOtra) {
        // Selección por ID (si hay mediosCobro)
        const medio = buscarMedioPorId(destinoCuenta);
        if (medio) {
          payload.medio_cobro_id = medio.id;
          payload.destino_tipo = medio.proveedor;   // 'mercado_pago' | 'billetera_virtual'
          payload.destino_cuenta = medio.etiqueta;  // alias/etiqueta
          pago_destino = medio.display;             // "Titular — Etiqueta"
        } else {
          // Compat: no tenemos id, solo texto (strings legacy)
          payload.destino_cuenta = destinoCuenta;
          pago_destino = destinoCuenta;
        }
      } else {
        // "Otra..."
        payload.destino_cuenta = destinoOtra.trim();
        pago_destino = payload.destino_cuenta;
      }
    }

    try {
      const maybe = onConfirm?.(payload);
      await Promise.resolve(maybe); // esperamos a que el pago termine OK

      // ✅ Notificación de pago (ahora con pago_destino)
      try {
        const pago_monto = `$ ${montoNumber.toLocaleString("es-AR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

        await sendAdminPagoRegistrado({
          aviso: "Pago registrado",
          cliente_nombre_apellido: clienteNombreApellido,
          cliente_dni: clienteDni,
          poliza_compania: polizaCompania,
          poliza_cobertura: polizaCobertura,
          pago_monto,
          pago_metodo: metodo,
          pago_cuota: pagoCuota,
          pago_destino, // ✅
        });
      } catch (err) {
        console.warn("[notificación pago] Falló el envío de email:", err);
      }
    } catch {
      return; // si falla el pago en backend, no notificamos
    }
  };

  const labelBase =
    "flex items-center gap-3 rounded-2xl border px-4 py-3 bg-neutral-900/70 border-neutral-700 hover:bg-neutral-900 transition cursor-pointer";
  const selectedRing = "ring-2 ring-primary-400/50";
  const legendCls = "text-sm text-neutral-300 mb-1";

  const resumenDestino = !needsDestino
    ? "—"
    : destinoEsOtra
    ? (destinoOtra?.trim() || "—")
    : (() => {
        const m = buscarMedioPorId(destinoCuenta);
        if (m) return m.display;
        return destinoCuenta || "—";
      })();

  return (
    <Transition appear show={!!isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Overlay */}
        <Transition.Child as={Fragment} enter="ease-out duration-150" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-120" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
        </Transition.Child>

        {/* Panel */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-2 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-2 scale-95"
            >
              <Dialog.Panel className="w-full max-w-xl overflow-hidden rounded-2xl bg-neutral-950 border border-neutral-800 ring-1 ring-neutral-800 text-white shadow-xl">
                {/* Header */}
                <div className="relative px-6 py-5 border-b border-neutral-800">
                  <Dialog.Title className="text-xl font-bold">{title}</Dialog.Title>
                  <button onClick={onClose} className="absolute right-3 top-3 rounded-lg p-2 hover:bg-neutral-800 border border-transparent hover:border-neutral-700" aria-label="Cerrar" title="Cerrar">
                    <HiX className="w-5 h-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="px-6 py-6 space-y-6">
                  {/* Método */}
                  <fieldset className="space-y-3">
                    <legend className={legendCls}>Método</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className={`${labelBase} ${metodo === "efectivo" ? selectedRing : ""}`}>
                        <input type="radio" name="metodo" value="efectivo" checked={metodo === "efectivo"} onChange={() => setMetodo("efectivo")} className="accent-primary-400" />
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-neutral-800"><HiCash className="w-4 h-4" /></span>
                          Efectivo
                        </span>
                      </label>

                      <label className={`${labelBase} ${metodo === "transferencia" ? selectedRing : ""}`}>
                        <input type="radio" name="metodo" value="transferencia" checked={metodo === "transferencia"} onChange={() => setMetodo("transferencia")} className="accent-primary-400" />
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-neutral-800"><HiRefresh className="w-4 h-4" /></span>
                          Transferencia
                        </span>
                      </label>
                    </div>
                  </fieldset>

                  {/* Destino del cobro (solo transferencia) */}
                  {metodo === "transferencia" && (
                    <fieldset className="space-y-3">
                      <legend className={legendCls}>Destino del cobro</legend>

                      {/* Resumen + ver opciones */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="inline-flex items-center gap-2 text-neutral-300">
                          <HiInformationCircle className="w-4 h-4 opacity-70" />
                          <span>
                            MP: <span className="font-semibold">{totalMP}</span> • Billeteras:{" "}
                            <span className="font-semibold">{totalBil}</span>
                          </span>
                          <span className="mx-2 text-neutral-500">|</span>
                          <span className="text-neutral-400">
                            Selección: <span className="text-neutral-200">{resumenDestino}</span>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setVerOpciones((v) => !v)}
                          className="inline-flex items-center gap-2 px-3 h-8 rounded-lg border border-neutral-700 bg-neutral-900/70 hover:bg-neutral-900 text-neutral-200"
                          title="Ver opciones disponibles"
                        >
                          <HiEye className="w-4 h-4" />
                          {verOpciones ? "Ocultar opciones" : "Ver opciones"}
                        </button>
                      </div>

                      {/* Panel de opciones (solo lectura) */}
                      {verOpciones && (
                        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-neutral-400 mb-2">Cuentas de Mercado Pago</p>
                              {(mediosMP.length === 0 && mpStrings.length === 0) ? (
                                <p className="text-sm text-neutral-500">No hay cuentas cargadas.</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {mediosMP.length > 0
                                    ? mediosMP.map((m) => (
                                        <span key={`mp-${m.id}`} className="px-3 h-8 inline-flex items-center rounded-xl border text-sm border-neutral-700 text-neutral-300 bg-neutral-900/70">
                                          {m.display}
                                        </span>
                                      ))
                                    : mpStrings.map((name) => (
                                        <span key={`mp-s-${name}`} className="px-3 h-8 inline-flex items-center rounded-xl border text-sm border-neutral-700 text-neutral-300 bg-neutral-900/70">
                                          {name}
                                        </span>
                                      ))}
                                </div>
                              )}
                            </div>

                            <div>
                              <p className="text-xs uppercase tracking-wide text-neutral-400 mb-2">Billeteras virtuales</p>
                              {(mediosBil.length === 0 && bilStrings.length === 0) ? (
                                <p className="text-sm text-neutral-500">No hay billeteras cargadas.</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {mediosBil.length > 0
                                    ? mediosBil.map((m) => (
                                        <span key={`bil-${m.id}`} className="px-3 h-8 inline-flex items-center rounded-xl border text-sm border-neutral-700 text-neutral-300 bg-neutral-900/70">
                                          {m.display}
                                        </span>
                                      ))
                                    : bilStrings.map((name) => (
                                        <span key={`bil-s-${name}`} className="px-3 h-8 inline-flex items-center rounded-xl border text-sm border-neutral-700 text-neutral-300 bg-neutral-900/70">
                                          {name}
                                        </span>
                                      ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="mt-3 text-xs text-neutral-500">
                            * Estas listas vienen de <span className="text-neutral-300">Cuentas y Billeteras</span> en la página de Pagos.
                          </p>
                        </div>
                      )}

                      {/* Selector único */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                          <span className="block text-sm font-medium text-neutral-300 mb-1">Destino (cuenta o billetera)</span>
                          <div className="relative">
                            <select
                              value={destinoCuenta}
                              onChange={(e) => setDestinoCuenta(e.target.value)}
                              className="h-12 w-full pr-10 pl-3 rounded-2xl bg-neutral-900 border border-neutral-800 focus:border-primary-400/60 focus:ring-4 focus:ring-primary-400/20 outline-none transition appearance-none"
                            >
                              <option value="" disabled>Seleccionar…</option>

                              {/* Preferimos opciones con id si existen */}
                              {mediosMP.length > 0 && (
                                <optgroup label="Mercado Pago">
                                  {mediosMP.map((m) => (
                                    <option key={`mp-opt-${m.id}`} value={String(m.id)}>{m.display}</option>
                                  ))}
                                </optgroup>
                              )}
                              {mediosBil.length > 0 && (
                                <optgroup label="Billeteras virtuales">
                                  {mediosBil.map((m) => (
                                    <option key={`bil-opt-${m.id}`} value={String(m.id)}>{m.display}</option>
                                  ))}
                                </optgroup>
                              )}

                              {/* Compat: strings si no hay objetos */}
                              {medios.length === 0 && (
                                <>
                                  <optgroup label="Mercado Pago">
                                    {mpStrings.map((name) => (
                                      <option key={`mp-opt-s-${name}`} value={name}>{name}</option>
                                    ))}
                                  </optgroup>
                                  <optgroup label="Billeteras virtuales">
                                    {bilStrings.map((name) => (
                                      <option key={`bil-opt-s-${name}`} value={name}>{name}</option>
                                    ))}
                                  </optgroup>
                                </>
                              )}

                              <option value="_otra_">Otra…</option>
                            </select>
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-70">
                              <HiChevronDown className="w-5 h-5" />
                            </span>
                          </div>
                        </label>

                        {destinoEsOtra && (
                          <label className="block">
                            <span className="block text-sm font-medium text-neutral-300 mb-1">Nombre de la cuenta/billetera</span>
                            <input
                              type="text"
                              value={destinoOtra}
                              onChange={(e) => setDestinoOtra(e.target.value)}
                              placeholder="Ej: MP Sucursal Centro"
                              className="h-12 w-full rounded-2xl bg-neutral-900 border border-neutral-800 focus:border-primary-400/60 focus:ring-4 focus:ring-primary-400/20 px-3 outline-none transition"
                            />
                          </label>
                        )}
                      </div>
                    </fieldset>
                  )}

                  {/* Monto */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">Monto a pagar</label>
                    <div className="flex items-stretch">
                      <span className="rounded-l-2xl border border-neutral-800 bg-neutral-900 px-4 h-14 inline-flex items-center text-sm text-neutral-300">AR$</span>
                      <input
                        ref={inputMontoRef}
                        type="text"
                        inputMode="decimal"
                        value={monto}
                        onChange={(e) => setMonto(e.target.value)}
                        placeholder={placeholderMonto}
                        className="h-14 w-full rounded-r-2xl bg-neutral-900 border border-neutral-800 focus:border-primary-400/60 focus:ring-4 focus:ring-primary-400/20 px-4 text-lg outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Fecha y Observaciones */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="block text-sm font-medium text-neutral-300 mb-1">Fecha de pago</span>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60"><HiCalendar className="w-5 h-5" /></span>
                        <input
                          type="date"
                          value={fechaPago}
                          onChange={(e) => setFechaPago(e.target.value)}
                          className="h-12 w-full pl-10 pr-3 rounded-2xl bg-neutral-900 border border-neutral-800 focus:border-primary-400/60 focus:ring-4 focus:ring-primary-400/20 outline-none transition"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="block text-sm font-medium text-neutral-300 mb-1">Observaciones (opcional)</span>
                      <div className="relative">
                        <span className="absolute left-3 top-3 opacity-60"><HiPencil className="w-5 h-5" /></span>
                        <textarea
                          rows={3}
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          placeholder="Detalle o referencia del pago…"
                          className="w-full pl-10 pr-3 py-2 rounded-2xl bg-neutral-900 border border-neutral-800 focus:border-primary-400/60 focus:ring-4 focus:ring-primary-400/20 outline-none transition"
                        />
                      </div>
                    </label>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 pt-2 flex justify-end gap-2">
                  <button onClick={onClose} className="h-12 px-5 rounded-2xl bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700 transition">Cancelar</button>
                  <motion.button
                    whileHover={{ scale: isValid ? 1.03 : 1 }}
                    whileTap={{ scale: isValid ? 0.98 : 1 }}
                    onClick={confirm}
                    disabled={!isValid}
                    className={`h-12 px-6 rounded-2xl font-semibold outline-none ring-1 transition
                      ${isValid ? "bg-primary-500 hover:bg-primary-400 text-white ring-primary-400/40"
                               : "bg-neutral-800 text-neutral-400 border border-neutral-700 cursor-not-allowed ring-neutral-700/50"}`}
                  >
                    Confirmar
                  </motion.button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

/* Utils */
function getLocalISODate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const y = d.getFullYear(), m = pad(d.getMonth() + 1), day = pad(d.getDate());
  return `${y}-${m}-${day}`;
}
function isValidISODate(s) {
  if (!s || typeof s !== "string") return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return getLocalISODate(d) === s;
}
