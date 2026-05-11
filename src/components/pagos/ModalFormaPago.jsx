/* src/components/pagos/ModalFormaPago.jsx — Optimizado: recuerda método/destino
   ✅ PORTAL + z-index alto (no queda detrás)
   ✅ Bloquea scroll del body mientras está abierto
   ✅ Emojis de dinero cuando se paga
*/
import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { createPortal } from "react-dom";
import { Dialog, Transition } from "@headlessui/react";
import { motion } from "framer-motion";
import {
  HiCash,
  HiRefresh,
  HiX,
  HiCalendar,
  HiPencil,
  HiChevronDown,
  HiEye,
  HiInformationCircle,
} from "react-icons/hi";
/* Notificación por email (con pago_destino) */
import { sendAdminPagoRegistrado } from "../../services/notifications/pagos";

const LS_LAST_METODO = "pagos:lastMetodo";
const LS_LAST_DESTINO = "pagos:lastDestinoCuenta"; // guarda id o string
const LS_VER_OPCIONES = "pagos:verOpciones";

export default function ModalFormaPago({
  isOpen,
  onClose,
  onConfirm,
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
  const [metodo, setMetodo] = useState("efectivo"); // 'efectivo' | 'transferencia'
  const [monto, setMonto] = useState("");
  const [fechaPago, setFechaPago] = useState(getLocalISODate());
  const [observaciones, setObservaciones] = useState("");

  // Destino (solo para 'transferencia')
  const [destinoCuenta, setDestinoCuenta] = useState("");
  const [destinoOtra, setDestinoOtra] = useState("");
  const [verOpciones, setVerOpciones] = useState(false);

  const inputMontoRef = useRef(null);

  // ✅ Bloquea scroll del body mientras el modal está abierto (mejora UX)
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow || "";
    };
  }, [isOpen]);

  const placeholderMonto = useMemo(() => {
    return Number.isFinite(Number(defaultMonto))
      ? String(Number(defaultMonto).toFixed(2)).replace(".", ",")
      : "0,00";
  }, [defaultMonto]);

  // Normalizo medios desde Redux (si vienen)
  const medios = useMemo(() => {
    if (!Array.isArray(mediosCobro) || mediosCobro.length === 0) return [];
    return mediosCobro
      .filter((m) => m && m.activo !== false)
      .map((m) => ({
        id: m.id,
        proveedor: m.proveedor, // 'mercado_pago' | 'billetera_virtual'
        etiqueta: m.etiqueta || m.valor || "",
        titular: m.titular_nombre || "",
        display: `${m.titular_nombre ? m.titular_nombre + " — " : ""}${
          m.etiqueta || m.valor || ""
        }`.trim(),
      }));
  }, [mediosCobro]);

  const mediosMP = useMemo(
    () => medios.filter((m) => m.proveedor === "mercado_pago"),
    [medios]
  );
  const mediosBil = useMemo(
    () => medios.filter((m) => m.proveedor === "billetera_virtual"),
    [medios]
  );

  // Compatibilidad: si no hay medios por objetos, uso strings para mostrar (sin id)
  const mpStrings = Array.isArray(cuentasMercadoPago) ? cuentasMercadoPago : [];
  const bilStrings = Array.isArray(billeterasVirtuales)
    ? billeterasVirtuales
    : [];

  const totalMP = mediosMP.length || mpStrings.length;
  const totalBil = mediosBil.length || bilStrings.length;

  useEffect(() => {
    if (!isOpen) return;

    // defaults rápidos (menos clicks)
    const lastMetodo = safeGetLS(LS_LAST_METODO);
    const lastDestino = safeGetLS(LS_LAST_DESTINO);
    const lastVer = safeGetLS(LS_VER_OPCIONES);

    setMetodo(lastMetodo === "transferencia" ? "transferencia" : "efectivo");
    setMonto("");
    setFechaPago(getLocalISODate());
    setObservaciones("");

    setDestinoCuenta(lastDestino ? String(lastDestino) : "");
    setDestinoOtra("");
    setVerOpciones(lastVer === "1");

    setTimeout(() => inputMontoRef.current?.focus(), 0);
  }, [isOpen]);

  const montoNumber = useMemo(() => {
    const s = String(monto ?? "").trim().replace(",", ".");
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
  }, [monto]);

  const needsDestino = metodo === "transferencia";
  const destinoEsOtra = destinoCuenta === "_otra_";

  const destinoValido =
    !needsDestino ||
    ((destinoCuenta && !destinoEsOtra) ||
      (destinoEsOtra && !!destinoOtra.trim()));

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

  const resumenDestino = !needsDestino
    ? "—"
    : destinoEsOtra
    ? destinoOtra?.trim() || "—"
    : (() => {
        const m = buscarMedioPorId(destinoCuenta);
        if (m) return m.display;
        return destinoCuenta || "—";
      })();

  const confirm = async () => {
    if (!isValid) return;

    const payload = {
      metodo,
      forma_pago: metodo,
      monto: Number(montoNumber.toFixed(2)),
      fecha_pago: fechaPago,
      observaciones: observaciones?.trim() || undefined,
    };

    let pago_destino = "";

    if (needsDestino) {
      if (!destinoEsOtra) {
        const medio = buscarMedioPorId(destinoCuenta);
        if (medio) {
          payload.medio_cobro_id = medio.id;
          payload.destino_tipo = medio.proveedor;
          payload.destino_cuenta = medio.etiqueta;
          pago_destino = medio.display;
        } else {
          payload.destino_cuenta = destinoCuenta; // compat strings
          pago_destino = destinoCuenta;
        }
      } else {
        payload.destino_cuenta = destinoOtra.trim();
        pago_destino = payload.destino_cuenta;
      }
    }

    // persistir para próxima atención (cero clicks repetidos)
    safeSetLS(LS_LAST_METODO, metodo);
    if (needsDestino) safeSetLS(LS_LAST_DESTINO, destinoCuenta || "");
    safeSetLS(LS_VER_OPCIONES, verOpciones ? "1" : "0");

    try {
      const maybe = onConfirm?.(payload);
      await Promise.resolve(maybe);

      // Email admin (no bloqueante)
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
          pago_destino,
        });
      } catch (err) {
        console.warn("[notificación pago] Falló el envío de email:", err);
      }
    } catch {
      return;
    }
  };

  const labelBase =
    "flex items-center gap-3 rounded-2xl border px-4 py-3 bg-neutral-900/70 border-neutral-700 hover:bg-neutral-900 transition cursor-pointer";
  const selectedRing = "ring-2 ring-primary-400/50";
  const legendCls = "text-sm text-neutral-300 mb-1";

  // ✅ emojis “de dinero” (cuando el usuario está pagando)
  const moneyTitle = useMemo(() => {
    // si querés que dependa de "monto > 0" también, podemos hacerlo,
    // pero el modal ya indica intención de pago: ponemos 🤑
    return `🤑 ${title}`;
  }, [title]);

  const confirmEmoji = needsDestino ? "🤑💳" : "🤑";

  const content = (
    <Transition appear show={!!isOpen} as={Fragment}>
      {/* ✅ z-index MUY alto para que jamás quede atrás */}
      <Dialog
        as="div"
        className="fixed inset-0 z-[9999]"
        onClose={onClose}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-120"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        </Transition.Child>

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
              <Dialog.Panel className="w-full max-w-xl overflow-hidden rounded-xl bg-slate-950 border border-slate-800 text-white shadow-xl">
                <div className="relative px-5 py-4 border-b border-slate-800">
                  <Dialog.Title className="text-base font-semibold text-slate-100">
                    {moneyTitle}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="absolute right-3 top-3 rounded-lg p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label="Cerrar"
                    title="Cerrar"
                  >
                    <HiX className="w-5 h-5" />
                  </button>
                </div>

                <div className="px-5 py-5 space-y-4">
                  <fieldset className="space-y-3">
                    <legend className={legendCls}>Método</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label
                        className={`${labelBase} ${
                          metodo === "efectivo" ? selectedRing : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="metodo"
                          value="efectivo"
                          checked={metodo === "efectivo"}
                          onChange={() => setMetodo("efectivo")}
                          className="accent-primary-400"
                        />
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800">
                            <HiCash className="w-4 h-4" />
                          </span>
                          Efectivo <span className="opacity-80">💵</span>
                        </span>
                      </label>

                      <label
                        className={`${labelBase} ${
                          metodo === "transferencia" ? selectedRing : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="metodo"
                          value="transferencia"
                          checked={metodo === "transferencia"}
                          onChange={() => setMetodo("transferencia")}
                          className="accent-primary-400"
                        />
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800">
                            <HiRefresh className="w-4 h-4" />
                          </span>
                          Transferencia <span className="opacity-80">💳</span>
                        </span>
                      </label>
                    </div>
                  </fieldset>

                  {metodo === "transferencia" && (
                    <fieldset className="space-y-3">
                      <legend className={legendCls}>Destino del cobro</legend>

                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="inline-flex items-center gap-2 text-neutral-300">
                          <HiInformationCircle className="w-4 h-4 opacity-70" />
                          <span>
                            MP: <span className="font-semibold">{totalMP}</span>{" "}
                            • Billeteras:{" "}
                            <span className="font-semibold">{totalBil}</span>
                          </span>
                          <span className="mx-2 text-neutral-500">|</span>
                          <span className="text-neutral-400">
                            Selección:{" "}
                            <span className="text-neutral-200">{resumenDestino}</span>
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

                      {verOpciones && (
                        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-neutral-400 mb-2">
                                Cuentas de Mercado Pago
                              </p>
                              {mediosMP.length === 0 && mpStrings.length === 0 ? (
                                <p className="text-sm text-neutral-500">
                                  No hay cuentas cargadas.
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {mediosMP.length > 0
                                    ? mediosMP.map((m) => (
                                        <span
                                          key={`mp-${m.id}`}
                                          className="px-2.5 h-7 inline-flex items-center rounded-md border text-xs border-slate-700 text-slate-400 bg-slate-900"
                                        >
                                          {m.display}
                                        </span>
                                      ))
                                    : mpStrings.map((name) => (
                                        <span
                                          key={`mp-s-${name}`}
                                          className="px-2.5 h-7 inline-flex items-center rounded-md border text-xs border-slate-700 text-slate-400 bg-slate-900"
                                        >
                                          {name}
                                        </span>
                                      ))}
                                </div>
                              )}
                            </div>

                            <div>
                              <p className="text-xs uppercase tracking-wide text-neutral-400 mb-2">
                                Billeteras virtuales
                              </p>
                              {mediosBil.length === 0 && bilStrings.length === 0 ? (
                                <p className="text-sm text-neutral-500">
                                  No hay billeteras cargadas.
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {mediosBil.length > 0
                                    ? mediosBil.map((m) => (
                                        <span
                                          key={`bil-${m.id}`}
                                          className="px-2.5 h-7 inline-flex items-center rounded-md border text-xs border-slate-700 text-slate-400 bg-slate-900"
                                        >
                                          {m.display}
                                        </span>
                                      ))
                                    : bilStrings.map((name) => (
                                        <span
                                          key={`bil-s-${name}`}
                                          className="px-2.5 h-7 inline-flex items-center rounded-md border text-xs border-slate-700 text-slate-400 bg-slate-900"
                                        >
                                          {name}
                                        </span>
                                      ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="mt-3 text-xs text-neutral-500">
                            * Estas listas vienen de{" "}
                            <span className="text-neutral-300">Cuentas y Billeteras</span>.
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                          <span className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1.5 font-medium">
                            Destino (cuenta o billetera)
                          </span>
                          <div className="relative">
                            <select
                              value={destinoCuenta}
                              onChange={(e) => setDestinoCuenta(e.target.value)}
                              className="h-10 w-full pr-10 pl-3 rounded-lg bg-slate-900 border border-slate-700 focus:border-slate-500 focus:outline-none outline-none transition-colors appearance-none text-sm"
                            >
                              <option value="" disabled>
                                Seleccionar…
                              </option>

                              {mediosMP.length > 0 && (
                                <optgroup label="Mercado Pago">
                                  {mediosMP.map((m) => (
                                    <option key={`mp-opt-${m.id}`} value={String(m.id)}>
                                      {m.display}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              {mediosBil.length > 0 && (
                                <optgroup label="Billeteras virtuales">
                                  {mediosBil.map((m) => (
                                    <option key={`bil-opt-${m.id}`} value={String(m.id)}>
                                      {m.display}
                                    </option>
                                  ))}
                                </optgroup>
                              )}

                              {medios.length === 0 && (
                                <>
                                  <optgroup label="Mercado Pago">
                                    {mpStrings.map((name) => (
                                      <option key={`mp-opt-s-${name}`} value={name}>
                                        {name}
                                      </option>
                                    ))}
                                  </optgroup>
                                  <optgroup label="Billeteras virtuales">
                                    {bilStrings.map((name) => (
                                      <option key={`bil-opt-s-${name}`} value={name}>
                                        {name}
                                      </option>
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
                            <span className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1.5 font-medium">
                              Nombre de la cuenta/billetera
                            </span>
                            <input
                              type="text"
                              value={destinoOtra}
                              onChange={(e) => setDestinoOtra(e.target.value)}
                              placeholder="Ej: MP Sucursal Centro"
                              className="h-10 w-full rounded-lg bg-slate-900 border border-slate-700 focus:border-slate-500 focus:outline-none px-3 outline-none transition-colors text-sm"
                            />
                          </label>
                        )}
                      </div>
                    </fieldset>
                  )}

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1.5 font-medium">
                      Monto a pagar
                    </label>
                    <div className="flex items-stretch">
                      <span className="rounded-l-lg border border-slate-700 bg-slate-900 px-3 h-10 inline-flex items-center text-sm text-slate-400 font-mono">
                        AR$
                      </span>
                      <input
                        ref={inputMontoRef}
                        type="text"
                        inputMode="decimal"
                        value={monto}
                        onChange={(e) => setMonto(e.target.value)}
                        placeholder={placeholderMonto}
                        className="h-10 w-full rounded-r-lg bg-slate-900 border border-slate-700 focus:border-slate-500 focus:outline-none px-3 text-base font-mono outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1.5 font-medium">
                        Fecha de pago
                      </span>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60">
                          <HiCalendar className="w-5 h-5" />
                        </span>
                        <input
                          type="date"
                          value={fechaPago}
                          onChange={(e) => setFechaPago(e.target.value)}
                          className="h-10 w-full pl-9 pr-3 rounded-lg bg-slate-900 border border-slate-700 focus:border-slate-500 focus:outline-none outline-none transition-colors text-sm"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1.5 font-medium">
                        Observaciones (opcional)
                      </span>
                      <div className="relative">
                        <span className="absolute left-3 top-3 opacity-60">
                          <HiPencil className="w-5 h-5" />
                        </span>
                        <textarea
                          rows={3}
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          placeholder="Detalle o referencia del pago…"
                          className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:border-slate-500 focus:outline-none outline-none transition-colors text-sm"
                        />
                      </div>
                    </label>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-3 flex justify-end gap-2 border-t border-slate-800">
                  <button
                    onClick={onClose}
                    className="h-9 px-4 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <motion.button
                    whileHover={{ scale: isValid ? 1.03 : 1 }}
                    whileTap={{ scale: isValid ? 0.98 : 1 }}
                    onClick={confirm}
                    disabled={!isValid}
                    className={`h-9 px-4 rounded-lg font-medium outline-none transition-colors inline-flex items-center gap-2 justify-center text-sm
                      ${
                        isValid
                          ? "bg-emerald-700 hover:bg-emerald-600 border border-emerald-600 text-white"
                          : "bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed"
                      }`}
                  >
                    <span aria-hidden="true" className="text-lg leading-none">
                      {confirmEmoji}
                    </span>
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

  // ✅ Portal al body: evita quedar detrás por stacking contexts (transform, etc.)
  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}

/* Utils */
function getLocalISODate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const y = d.getFullYear(),
    m = pad(d.getMonth() + 1),
    day = pad(d.getDate());
  return `${y}-${m}-${day}`;
}
function isValidISODate(s) {
  if (!s || typeof s !== "string") return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return getLocalISODate(d) === s;
}
function safeGetLS(key) {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}
function safeSetLS(key, value) {
  try {
    localStorage.setItem(key, String(value ?? ""));
  } catch {
    // ignore
  }
}