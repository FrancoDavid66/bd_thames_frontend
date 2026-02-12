/* src/components/pagos/PagosList.jsx — Dark theme con acentos pasteles sólidos, full-width móvil (OPTIMIZADO) */
import { useDispatch } from "react-redux";
import { useMemo, useState, useCallback, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import {
  HiBadgeCheck,
  HiClock,
  HiCash,
  HiDeviceMobile,
  HiExclamationCircle,
  HiUser,
  HiQuestionMarkCircle,
  HiX,
} from "react-icons/hi";

import { marcarCuotaComoPagada } from "../../store/slices/pagosSlice";
import DescargarFactura from "./DescargarFactura";
import ImprimirFacturaTicket from "./ImprimirFacturaTicket";
import EnviarFacturaWhatsapp from "./EnviarFacturaWhatsapp";
import ModalFormaPago from "./ModalFormaPago";

/* ====== Paleta dark + pasteles sólidos ====== */
const PALETTE = {
  basePanel: "bg-[#0b0e12] border-neutral-900",
  header: "bg-neutral-950 text-neutral-300",
  divider: "divide-neutral-900",

  paid: {
    stripe: "bg-emerald-400",
    cardBg: "bg-neutral-900",
    text: "text-neutral-100",
    border: "border-emerald-400/40",
    chipBg: "bg-emerald-300",
    chipText: "text-emerald-950",
    chipBorder: "border-emerald-400",
    noteBg: "bg-emerald-300",
    noteText: "text-emerald-950",
    btn: "bg-emerald-300 hover:bg-emerald-400 text-emerald-950 border-emerald-500",
    dot: "bg-emerald-400",
  },
  pending: {
    stripe: "bg-amber-400",
    cardBg: "bg-neutral-900",
    text: "text-neutral-100",
    border: "border-amber-400/40",
    chipBg: "bg-amber-300",
    chipText: "text-amber-950",
    chipBorder: "border-amber-400",
    noteBg: "bg-amber-300",
    noteText: "text-amber-950",
    btn: "bg-amber-300 hover:bg-amber-400 text-amber-950 border-amber-500",
    dot: "bg-amber-400",
  },
  overdue: {
    stripe: "bg-rose-400",
    cardBg: "bg-neutral-900",
    text: "text-neutral-100",
    border: "border-rose-400/40",
    chipBg: "bg-rose-300",
    chipText: "text-rose-950",
    chipBorder: "border-rose-400",
    noteBg: "bg-rose-300",
    noteText: "text-rose-950",
    btn: "bg-rose-300 hover:bg-rose-400 text-rose-950 border-rose-500",
    dot: "bg-rose-400",
  },

  neutralBtn:
    "bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border-neutral-700",
  actionBtn: "bg-indigo-400 hover:bg-indigo-500 text-indigo-950",

  // botón ticket térmico (pastel violeta)
  ticketBtn:
    "bg-violet-300 hover:bg-violet-400 text-violet-950 border-violet-500",
};

/* ====== Formatters cacheados (evita recrear Intl por fila/render) ====== */
const MONEY_FMT = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const fmtMoney = (n) => MONEY_FMT.format(Number(n || 0));
const fmtDate = (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "—");

/* ====== Performance knobs ====== */
const AUTO_FAST_THRESHOLD = 120; // si hay >= 120 items, activa modo rápido
const FAST_INITIAL = 40;
const FAST_STEP = 60;
const SHOW_FAST_TOGGLE_FROM = 60;

/* ====== helpers “hoy” estable que se actualiza al cambiar el día ====== */
function todayKey() {
  return dayjs().format("YYYY-MM-DD");
}
function msUntilNextDay() {
  const now = dayjs();
  const next = now.add(1, "day").startOf("day").add(2, "second"); // colchón
  const ms = next.diff(now, "millisecond");
  return Math.max(5_000, Math.min(ms, 24 * 60 * 60 * 1000));
}

// ✅ helper: normaliza la respuesta del backend al pagar
function pickCuotaActualizada(resp) {
  const r = resp && typeof resp === "object" ? resp : null;
  if (!r) return null;
  if (r.cuotaActualizada && typeof r.cuotaActualizada === "object")
    return r.cuotaActualizada;
  if (r.data && typeof r.data === "object") return r.data;
  return r;
}

/* ================== Resolver robusto de Cliente ==================
   ✅ FIX: Evita el fallback “Cliente” cuando:
     - llega poliza.cliente como objeto (ok)
     - llega poliza.cliente_nombre_apellido / cliente_nombre_completo (flat)
     - llega el nuevo formato PRO (poliza.cliente con nombre/apellido/dni)
   y NUNCA toma el string "cliente" como nombre.
*/
function safeStr(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}
function isBadClienteLabel(s) {
  const x = safeStr(s).toLowerCase();
  return !x || x === "cliente" || x === "client" || x === "asegurado";
}
function resolveCliente(pol, cuota) {
  const p = pol && typeof pol === "object" ? pol : {};
  const c = p?.cliente;

  const isObjCliente = c && typeof c === "object" && !Array.isArray(c);

  const apellido =
    safeStr(isObjCliente ? c.apellido : "") ||
    safeStr(p.cliente_apellido) ||
    safeStr(p.apellido) ||
    safeStr(cuota?.cliente_apellido);

  const nombre =
    safeStr(isObjCliente ? c.nombre : "") ||
    safeStr(p.cliente_nombre) ||
    safeStr(p.nombre) ||
    safeStr(cuota?.cliente_nombre);

  // ✅ estos campos vienen en el “cuota flat normalizada” y/o desde el backend
  const nombreCompletoFlat =
    safeStr(p.cliente_nombre_completo) ||
    safeStr(p.cliente_nombre_apellido) ||
    safeStr(p.cliente_nombre) ||
    safeStr(p.asegurado_nombre_completo) ||
    safeStr(cuota?.cliente_nombre_completo) ||
    safeStr(cuota?.cliente_nombre_apellido);

  const asegurado =
    safeStr(p.asegurado_nombre) ||
    safeStr(p.asegurado) ||
    safeStr(cuota?.asegurado);

  const dni =
    safeStr(isObjCliente ? c.dni_cuit_cuil : "") ||
    safeStr(p.cliente_dni) ||
    safeStr(cuota?.cliente_dni) ||
    safeStr(p.dni_cuit_cuil) ||
    safeStr(cuota?.dni_cuit_cuil);

  const id =
    (isObjCliente && (typeof c.id === "number" || typeof c.id === "string")
      ? c.id
      : null) ??
    p.cliente_id ??
    cuota?.cliente_id ??
    null;

  // 1) objeto normal => "Apellido, Nombre"
  const byObj =
    [safeStr(isObjCliente ? c.apellido : ""), safeStr(isObjCliente ? c.nombre : "")]
      .filter(Boolean)
      .join(", ")
      .trim();

  // 2) partes => "Apellido, Nombre"
  const byParts = [apellido, nombre].filter(Boolean).join(", ").trim();

  // 3) flat “nombre completo”
  const byFlatFull = safeStr(nombreCompletoFlat);

  // 4) asegurado (compat)
  const byAsegurado = safeStr(asegurado);

  // 5) si cliente viene string y no es "cliente"
  const byStringCliente =
    typeof c === "string" && !isBadClienteLabel(c) ? safeStr(c) : "";

  // ✅ orden de preferencia: obj > parts > flat > asegurado > string
  let nombreCompleto =
    byObj || byParts || byFlatFull || byAsegurado || byStringCliente;

  // ✅ último resguardo: si igual cayó en “cliente”
  if (isBadClienteLabel(nombreCompleto)) nombreCompleto = "";

  // ✅ fallback final (pero ya no “Cliente” a secas si hay DNI)
  if (!nombreCompleto) {
    nombreCompleto = dni ? `Cliente (${dni})` : "Cliente";
  }

  // para WhatsApp/modal: "Nombre Apellido"
  const nombreAp = (() => {
    if (nombreCompleto.includes(",")) {
      const [ap, nom] = nombreCompleto.split(",").map((x) => x.trim());
      return [nom, ap].filter(Boolean).join(" ").trim();
    }
    return nombreCompleto;
  })();

  return { nombreCompleto, nombreAp, dni, id };
}

export default function PagosList({
  cuotas = [],
  actualizarCuotas,
  ocultarPagadas = false,
  cuentasMercadoPago = [],
  billeterasVirtuales = [],
  mediosCobro = [],
  preferFast = false,
}) {
  const dispatch = useDispatch();
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState(null);
  const [obsAbiertaId, setObsAbiertaId] = useState(null);
  const [detalleAbierto, setDetalleAbierto] = useState(null);

  const [confirmData, setConfirmData] = useState(null);
  const [confirmandoPago, setConfirmandoPago] = useState(false);

  const items = useMemo(() => {
    const base = Array.isArray(cuotas) ? cuotas : [];
    return ocultarPagadas ? base.filter((c) => !c.pagado) : base;
  }, [cuotas, ocultarPagadas]);

  const [hoyKey, setHoyKey] = useState(todayKey());
  useEffect(() => {
    let t = null;
    const tick = () => {
      setHoyKey(todayKey());
      t = setTimeout(tick, msUntilNextDay());
    };
    t = setTimeout(tick, msUntilNextDay());
    return () => {
      if (t) clearTimeout(t);
    };
  }, []);

  const hoy = useMemo(() => dayjs(hoyKey).startOf("day"), [hoyKey]);

  /* ================== Modo rápido + render progresivo ================== */
  const [modoRapidoManual, setModoRapidoManual] = useState(null);

  const modoRapidoAuto =
    !!preferFast || (Array.isArray(items) && items.length >= AUTO_FAST_THRESHOLD);

  const modoRapido = modoRapidoManual ?? modoRapidoAuto;

  const [renderLimit, setRenderLimit] = useState(
    modoRapido ? Math.min(FAST_INITIAL, items.length) : items.length
  );

  useEffect(() => {
    if (!modoRapido) {
      setRenderLimit(items.length);
      return;
    }
    setRenderLimit(Math.min(FAST_INITIAL, items.length));
  }, [items.length, modoRapido]);

  const visibleItems = useMemo(() => {
    if (!modoRapido) return items;
    return items.slice(0, renderLimit);
  }, [items, modoRapido, renderLimit]);

  const showFastControls = items.length >= SHOW_FAST_TOGGLE_FROM;

  /* ================== Handlers memo ================== */
  const abrirPagar = useCallback((cuota) => setCuotaSeleccionada(cuota), []);
  const cerrarPagar = useCallback(() => setCuotaSeleccionada(null), []);
  const abrirDetalle = useCallback((cuota) => setDetalleAbierto(cuota), []);
  const cerrarDetalle = useCallback(() => setDetalleAbierto(null), []);
  const toggleObs = useCallback((id) => {
    setObsAbiertaId((prev) => (prev === id ? null : id));
  }, []);

  const confirmarPago = useCallback(
    (datos) => {
      if (!cuotaSeleccionada) return;

      const cuota = cuotaSeleccionada;
      const monto = Number(datos.monto ?? cuota.monto);
      const pol = cuota.poliza || {};
      const numeroPoliza =
        pol.numero_poliza || pol.numero || pol.nro_poliza || pol.n_poliza || "-";

      setConfirmData({
        datos,
        cuota,
        monto,
        numeroPoliza,
        cuotaNro: cuota.cuota_nro,
      });

      cerrarPagar();
    },
    [cuotaSeleccionada, cerrarPagar]
  );

  const ejecutarPagoConfirmado = useCallback(async () => {
    if (!confirmData) return;
    if (confirmandoPago) return;

    const { datos, cuota, monto } = confirmData;

    const payload = {
      id: cuota.id,
      metodo: datos.metodo,
      forma_pago: datos.forma_pago,
      monto,
      fecha_pago: datos.fecha_pago,
      observaciones: datos.observaciones,
    };
    if (datos.medio_cobro_id) payload.medio_cobro_id = datos.medio_cobro_id;
    if (datos.destino_tipo) payload.destino_tipo = datos.destino_tipo;
    if (datos.destino_cuenta) payload.destino_cuenta = datos.destino_cuenta;

    try {
      setConfirmandoPago(true);

      const resp = await dispatch(marcarCuotaComoPagada(payload)).unwrap();
      const cuotaActualizada = pickCuotaActualizada(resp);

      if (!cuotaActualizada || typeof cuotaActualizada !== "object") {
        toast.error("Pago registrado, pero no pude actualizar la cuota en pantalla.");
        setConfirmData(null);
        return;
      }

      toast.success("Cuota marcada como pagada");

      const conObs = {
        ...cuotaActualizada,
        poliza: cuotaActualizada.poliza || cuota.poliza,
        cantidad_cuotas:
          cuotaActualizada.cantidad_cuotas ?? cuota.cantidad_cuotas ?? null,
        observaciones_pago: (datos.observaciones || "").trim(),
      };

      setConfirmData(null);
      actualizarCuotas?.([conObs]);

      if (conObs.observaciones_pago) setObsAbiertaId(conObs.id);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo registrar el pago");
    } finally {
      setConfirmandoPago(false);
    }
  }, [confirmData, confirmandoPago, dispatch, actualizarCuotas]);

  const handleCancelarConfirm = useCallback(() => {
    if (!confirmData) {
      setConfirmData(null);
      return;
    }
    const { cuota } = confirmData;
    setConfirmData(null);
    if (cuota) setCuotaSeleccionada(cuota);
  }, [confirmData]);

  const datosNoti = useMemo(() => {
    if (!cuotaSeleccionada) return null;
    const pol = cuotaSeleccionada.poliza || {};

    const cliR = resolveCliente(pol, cuotaSeleccionada);

    const compania = (
      pol.compania_nombre ||
      pol.compania?.nombre ||
      pol.compania ||
      ""
    )
      .toString()
      .trim();

    const cobertura = (pol.cobertura || "").toString().trim();

    const total =
      cuotaSeleccionada?.cantidad_cuotas ??
      (Array.isArray(pol.cuotas) ? pol.cuotas.length : null);

    const cuotaTxt =
      typeof cuotaSeleccionada.cuota_nro === "number"
        ? total
          ? `Cuota ${cuotaSeleccionada.cuota_nro}/${total}`
          : `Cuota ${cuotaSeleccionada.cuota_nro}`
        : "";

    return {
      nombreAp: cliR?.nombreAp || "",
      dni: cliR?.dni || "",
      compania,
      cobertura,
      cuotaTxt,
    };
  }, [cuotaSeleccionada]);

  /* ================== Pre-cálculo por cuota (evita dayjs + format por fila) ================== */
  const rowModels = useMemo(() => {
    const base = Array.isArray(visibleItems) ? visibleItems : [];
    const out = new Array(base.length);

    for (let i = 0; i < base.length; i++) {
      const cuota = base[i];
      const pol = cuota?.poliza || {};

      const cliR = resolveCliente(pol, cuota);

      const nombreCompleto = cliR?.nombreCompleto || "Cliente";

      const patente = (pol?.patente || "").toUpperCase();
      const modelo = [pol?.marca, pol?.modelo].filter(Boolean).join(" ");

      const observacion = (
        (cuota?.observaciones_pago || cuota?.ultima_observacion_pago || "") || ""
      )
        .toString()
        .trim();

      const fv = cuota?.fecha_vencimiento
        ? dayjs(cuota.fecha_vencimiento).startOf("day")
        : null;
      const dias = fv ? fv.diff(hoy, "day") : null;

      const state = cuota?.pagado
        ? "paid"
        : dias !== null && dias < 0
        ? "overdue"
        : "pending";

      const label =
        state === "paid" ? "Pagada" : state === "overdue" ? "Vencida" : "Pendiente";

      out[i] = {
        cuota,
        pol,
        nombreCompleto,
        patente,
        modelo,
        observacion,
        hasObs: !!observacion,
        isObsOpen: obsAbiertaId === cuota?.id,
        state,
        label,
        dias,
        venceTxt: fmtDate(cuota?.fecha_vencimiento),
        pagaTxt: cuota?.fecha_pago ? fmtDate(cuota?.fecha_pago) : null,
        montoTxt: fmtMoney(cuota?.monto),
      };
    }
    return out;
  }, [visibleItems, hoy, obsAbiertaId]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950 p-10 text-center text-neutral-400">
        No hay cuotas para mostrar.
      </div>
    );
  }

  return (
    <div
      className={`
        w-full
        ${PALETTE.basePanel}
        rounded-none sm:rounded-3xl
        border-t border-b sm:border
        overflow-hidden
      `}
    >
      {/* Encabezado */}
      <div
        className={`px-4 sm:px-6 py-3 sm:py-4 text-sm uppercase tracking-wide border-b border-neutral-900 ${PALETTE.header}`}
      >
        <div className="flex items-center justify-between gap-3">
          <span>Resultados</span>

          {showFastControls && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] normal-case text-neutral-500">
                {items.length} cuotas
              </span>
              <button
                type="button"
                onClick={() =>
                  setModoRapidoManual((v) => {
                    const current = v ?? modoRapido;
                    return !current;
                  })
                }
                className={`h-8 px-3 rounded-xl border text-[11px] transition cursor-pointer ${
                  modoRapido
                    ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
                    : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:bg-neutral-900"
                }`}
                title="Modo rápido reduce animaciones y renderiza por partes"
              >
                {modoRapido ? "Modo rápido: ON" : "Modo rápido: OFF"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lista tipo cards oscuras — scroll solo en desktop */}
      <div className="max-h-none md:max-h-[60vh] overflow-y-visible md:overflow-y-auto">
        <ul role="list" className={`divide-y ${PALETTE.divider}`}>
          {rowModels.map((m, idx) => {
            const Comp = modoRapido ? "li" : motion.li;
            const motionProps = modoRapido
              ? {}
              : {
                  initial: { opacity: 0, y: 8 },
                  animate: { opacity: 1, y: 0 },
                  transition: {
                    duration: 0.2,
                    ease: "easeOut",
                    delay: Math.min(0.25, idx * 0.012),
                  },
                };

            return (
              <Comp key={m?.cuota?.id} className="relative" {...motionProps}>
                <CuotaRow
                  model={m}
                  abrirDetalle={abrirDetalle}
                  abrirPagar={abrirPagar}
                  onToggleObs={toggleObs}
                />
              </Comp>
            );
          })}
        </ul>

        {/* Render progresivo */}
        {modoRapido && renderLimit < items.length && (
          <div className="p-3 sm:p-4 border-t border-neutral-900 bg-neutral-950">
            <button
              type="button"
              onClick={() =>
                setRenderLimit((n) => Math.min(items.length, n + FAST_STEP))
              }
              className="w-full h-11 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-sm font-semibold cursor-pointer"
            >
              Mostrar más ({Math.min(FAST_STEP, items.length - renderLimit)})
            </button>
          </div>
        )}
      </div>

      {/* Modal de pago (oscuro) */}
      <ModalFormaPago
        isOpen={!!cuotaSeleccionada}
        onClose={cerrarPagar}
        onConfirm={confirmarPago}
        defaultMonto={cuotaSeleccionada?.monto}
        title={`Confirmar pago — Cuota #${cuotaSeleccionada?.cuota_nro ?? "?"}`}
        cuentasMercadoPago={cuentasMercadoPago}
        billeterasVirtuales={billeterasVirtuales}
        mediosCobro={mediosCobro}
        clienteNombreApellido={datosNoti?.nombreAp || ""}
        clienteDni={datosNoti?.dni || ""}
        polizaCompania={datosNoti?.compania || ""}
        polizaCobertura={datosNoti?.cobertura || ""}
        pagoCuota={datosNoti?.cuotaTxt || ""}
      />

      {/* Modal de confirmación de pago (oscuro, monto grande) */}
      <AnimatePresence>
        {confirmData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[65] flex items-center justify-center"
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={confirmandoPago ? undefined : handleCancelarConfirm}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 12 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="relative z-[66] w-[min(420px,92vw)] rounded-2xl border border-neutral-800 bg-neutral-950 px-6 py-6 shadow-2xl"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <h3 className="text-lg font-semibold text-neutral-50">
                  Confirmar pago
                </h3>
                <button
                  onClick={handleCancelarConfirm}
                  disabled={confirmandoPago}
                  className={`h-9 px-3 rounded-xl border text-neutral-200 inline-flex items-center gap-2 text-sm cursor-pointer ${
                    confirmandoPago
                      ? "bg-neutral-900/40 border-neutral-800 text-neutral-600 cursor-not-allowed"
                      : "bg-neutral-800 hover:bg-neutral-700 border-neutral-700"
                  }`}
                >
                  <HiX className="w-5 h-5" />
                  <span className="hidden sm:inline">Cancelar</span>
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-neutral-300">
                  Vas a pagar la cuota{" "}
                  <span className="font-semibold">
                    #{confirmData.cuotaNro ?? "?"}
                  </span>{" "}
                  de la póliza{" "}
                  <span className="font-semibold">
                    {confirmData.numeroPoliza}
                  </span>
                  .
                </p>

                <div className="mt-2 mb-4 text-center">
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-400 mb-1">
                    Importe a pagar
                  </p>
                  <p className="text-4xl sm:text-5xl font-extrabold tracking-tight text-emerald-400">
                    $ {fmtMoney(confirmData.monto)}
                  </p>
                </div>

                <p className="text-xs text-neutral-400">
                  Revisá que el monto sea correcto antes de confirmar. Si hay
                  un error podés volver al formulario y ajustarlo.
                </p>
              </div>

              <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:justify-end">
                <button
                  onClick={handleCancelarConfirm}
                  disabled={confirmandoPago}
                  className={`h-10 px-4 rounded-xl border text-sm cursor-pointer ${
                    confirmandoPago
                      ? "bg-neutral-900/40 border-neutral-800 text-neutral-600 cursor-not-allowed"
                      : "bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-200"
                  }`}
                >
                  Volver y corregir
                </button>
                <button
                  onClick={ejecutarPagoConfirmado}
                  disabled={confirmandoPago}
                  className={`h-10 px-4 rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-2 cursor-pointer ${
                    confirmandoPago
                      ? "bg-emerald-900/30 text-emerald-200/40 cursor-not-allowed"
                      : "bg-emerald-500 hover:bg-emerald-600 text-white"
                  }`}
                >
                  {confirmandoPago ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
                      Confirmando…
                    </>
                  ) : (
                    <>
                      <HiCash className="w-5 h-5" />
                      Confirmar pago
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal “Más info” (oscuro) */}
      <AnimatePresence>
        {detalleAbierto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center"
          >
            <div
              onClick={cerrarDetalle}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="relative z-[61] w-[min(680px,92vw)] rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-detalle-title"
            >
              <div className="flex items-start justify-between gap-4">
                <h3
                  id="modal-detalle-title"
                  className="text-lg font-semibold text-neutral-50"
                >
                  Detalle de cuota
                </h3>
                <button
                  onClick={cerrarDetalle}
                  className="h-9 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 inline-flex items-center gap-2 cursor-pointer"
                  aria-label="Cerrar"
                >
                  <HiX className="w-5 h-5" />
                  <span className="hidden sm:inline">Cerrar</span>
                </button>
              </div>

              {(() => {
                const c = detalleAbierto;
                const pol = c?.poliza || {};

                const cliR = resolveCliente(pol, c);

                const nombreCompleto = cliR?.nombreCompleto || "Cliente";
                const clienteId = cliR?.id;
                const dni = (cliR?.dni || "").toString().trim();

                const patente = (pol?.patente || "").toUpperCase();
                const modelo = [pol?.marca, pol?.modelo].filter(Boolean).join(" ");
                const cobertura = (pol?.cobertura || "").toString().trim();
                const compania = (
                  pol?.compania_nombre ||
                  pol?.compania?.nombre ||
                  pol?.compania ||
                  ""
                )
                  .toString()
                  .trim();

                const total =
                  c?.cantidad_cuotas ??
                  (Array.isArray(pol?.cuotas) ? pol.cuotas.length : null);

                return (
                  <div className="mt-4 space-y-4 text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <InfoRow label="Cliente" value={nombreCompleto} />
                      <InfoRow
                        label="Cliente ID"
                        value={
                          clienteId !== null && clienteId !== undefined
                            ? `#${clienteId}`
                            : "—"
                        }
                      />
                      <InfoRow label="DNI/CUIT" value={dni || "—"} />
                      <InfoRow label="Patente" value={patente || "—"} />
                      <InfoRow label="Vehículo" value={modelo || "—"} />
                      <InfoRow label="Cobertura" value={cobertura || "—"} />
                      <InfoRow label="Compañía" value={compania || "—"} />
                      <InfoRow
                        label="Cuota"
                        value={
                          typeof c?.cuota_nro === "number"
                            ? total
                              ? `${c.cuota_nro}/${total}`
                              : `${c.cuota_nro}`
                            : "—"
                        }
                      />
                      <InfoRow label="Monto" value={`$ ${fmtMoney(c?.monto)}`} />
                      <InfoRow
                        label="Vencimiento"
                        value={fmtDate(c?.fecha_vencimiento)}
                      />
                      <InfoRow
                        label="Fecha de pago"
                        value={fmtDate(c?.fecha_pago)}
                      />
                      <InfoRow
                        label="Estado"
                        value={
                          c?.pagado
                            ? "Pagada"
                            : c?.fecha_vencimiento &&
                              dayjs(c.fecha_vencimiento).isBefore(dayjs(), "day")
                            ? "Vencida"
                            : "Pendiente"
                        }
                      />
                    </div>

                    {(c?.observaciones_pago || c?.ultima_observacion_pago) && (
                      <div className="rounded-2xl border border-rose-400 bg-rose-300 p-3 text-rose-950">
                        <div className="flex items-start gap-2">
                          <HiExclamationCircle className="w-5 h-5 mt-0.5 shrink-0" />
                          <div className="whitespace-pre-wrap break-words">
                            <span className="font-semibold">Observaciones: </span>
                            {(c?.observaciones_pago ||
                              c?.ultima_observacion_pago ||
                              "")
                              .toString()
                              .trim()}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        onClick={cerrarDetalle}
                        className="h-10 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 cursor-pointer"
                      >
                        Entendido
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ====== Row memoizada (custom compare) ====== */
const CuotaRow = memo(
  function CuotaRow({ model, abrirDetalle, abrirPagar, onToggleObs }) {
    const {
      cuota,
      nombreCompleto,
      patente,
      modelo,
      observacion,
      hasObs,
      isObsOpen,
      state,
      label,
      dias,
      venceTxt,
      pagaTxt,
      montoTxt,
      pol, // ✅ viene del rowModel
    } = model || {};

    const S = PALETTE[state || "pending"];
    const Icon = state === "paid" ? HiBadgeCheck : HiClock;

    return (
      <>
        <span className={`absolute left-0 top-0 h-full w-1.5 ${S.stripe}`} aria-hidden />

        <div
          className={`mx-0 sm:mx-3 my-2 sm:my-3 rounded-none sm:rounded-2xl border p-4 shadow-sm ${S.cardBg} ${S.text} ${S.border}`}
        >
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-neutral-800 text-neutral-200 ring-1 ring-white/5">
                  <HiUser className="w-5 h-5" />
                </span>
                <span className="truncate max-w-[60ch] font-semibold">
                  {nombreCompleto}
                </span>

                {patente && (
                  <span className="inline-flex items-center gap-1 rounded-full border px-3 h-8 bg-neutral-800 border-neutral-700 text-neutral-100">
                    {patente}
                  </span>
                )}

                {modelo && (
                  <span className="inline-flex items-center gap-1 rounded-full border px-3 h-8 bg-neutral-800 border-neutral-700 text-neutral-300">
                    {modelo}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 h-8 ${S.chipBg} ${S.chipText} ${S.chipBorder}`}
                >
                  <span className={`w-2 h-2 rounded-full ${S.dot}`} />
                  <Icon className="w-4 h-4" />
                  {label}
                </span>

                <span className="text-neutral-500">•</span>

                <div className="text-sm text-neutral-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>Vence: {venceTxt}</span>
                  {!!pagaTxt && <span>Pagada: {pagaTxt}</span>}
                  {dias !== null && !cuota?.pagado && (
                    <span>
                      {dias < 0
                        ? `Atraso: ${Math.abs(dias)} días`
                        : `Faltan: ${dias} días`}
                    </span>
                  )}
                </div>
              </div>

              {hasObs && isObsOpen && (
                <div
                  className={`mt-3 rounded-2xl border px-3 py-3 ${PALETTE.overdue.noteBg} ${PALETTE.overdue.noteText} border-rose-400`}
                >
                  <div className="flex items-start gap-2">
                    <HiExclamationCircle className="w-5 h-5 mt-0.5 shrink-0" />
                    <div className="text-sm whitespace-pre-wrap break-words">
                      <span className="font-semibold">Observaciones: </span>
                      {observacion}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-stretch sm:items-end gap-3 w-full sm:w-auto">
              <p className="text-3xl font-extrabold tracking-tight text-neutral-50 text-right w-full">
                $ {montoTxt}
              </p>

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 md:gap-3 w-full">
                <button
                  onClick={() => abrirDetalle(cuota)}
                  className={`h-10 px-3 rounded-xl border ${PALETTE.neutralBtn} transition inline-flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer`}
                  title="Ver más información"
                  aria-label="Ver más información"
                >
                  <HiQuestionMarkCircle className="w-5 h-5" />
                  <span className="hidden sm:inline">Más info</span>
                </button>

                {hasObs && (
                  <button
                    onClick={() => onToggleObs(cuota?.id)}
                    className={`h-10 px-3 rounded-xl border ${PALETTE.overdue.btn} inline-flex items-center justify-center gap-2 transition w-full sm:w-auto cursor-pointer`}
                    title={isObsOpen ? "Ocultar observación" : "Ver observación"}
                  >
                    <HiExclamationCircle className="w-5 h-5" />
                    <span className="hidden sm:inline">
                      {isObsOpen ? "Ocultar nota" : "Ver nota"}
                    </span>
                  </button>
                )}

                {!cuota?.pagado && (
                  <button
                    onClick={() => abrirPagar(cuota)}
                    className={`h-10 px-4 rounded-xl ${PALETTE.actionBtn} transition inline-flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer`}
                    title="Registrar pago"
                  >
                    <HiCash className="w-5 h-5" />
                    <span className="hidden sm:inline">Pagar</span>
                  </button>
                )}

                {cuota?.pagado && (
                  <>
                    <DescargarFactura
                      // ✅ FIX: siempre pasamos cliente REAL (obj), no “string cliente”
                      cliente={pol?.cliente && typeof pol.cliente === "object" ? pol.cliente : null}
                      poliza={pol}
                      cuota={cuota}
                      tone="neutral"
                      label="Compartir factura"
                      className="mt-0 w-full sm:w-auto"
                    />

                    <ImprimirFacturaTicket
                      cliente={pol?.cliente && typeof pol.cliente === "object" ? pol.cliente : null}
                      poliza={pol}
                      cuota={cuota}
                      label="Imprimir factura"
                      className={`h-10 px-3 rounded-xl border transition inline-flex items-center justify-center gap-2 w-full sm:w-auto ${PALETTE.ticketBtn}`}
                    />
                  </>
                )}

                <EnviarFacturaWhatsapp cuota={cuota}>
                  <button
                    className={`h-10 px-3 rounded-xl border ${PALETTE.neutralBtn} transition inline-flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer`}
                    title="Enviar por WhatsApp"
                  >
                    <HiDeviceMobile className="w-5 h-5" />
                    <span className="hidden sm:inline">Enviar</span>
                  </button>
                </EnviarFacturaWhatsapp>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  },
  (prev, next) => {
    const a = prev?.model;
    const b = next?.model;
    if (a === b) return true;

    if (a?.isObsOpen !== b?.isObsOpen) return false;

    const ca = a?.cuota;
    const cb = b?.cuota;
    if (ca?.id !== cb?.id) return false;
    if (ca?.pagado !== cb?.pagado) return false;
    if (ca?.monto !== cb?.monto) return false;
    if (ca?.fecha_vencimiento !== cb?.fecha_vencimiento) return false;
    if (ca?.fecha_pago !== cb?.fecha_pago) return false;
    if (ca?.observaciones_pago !== cb?.observaciones_pago) return false;
    if (ca?.ultima_observacion_pago !== cb?.ultima_observacion_pago) return false;

    if (a?.nombreCompleto !== b?.nombreCompleto) return false;
    if (a?.patente !== b?.patente) return false;
    if (a?.modelo !== b?.modelo) return false;

    return true;
  }
);

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2">
      <span className="text-neutral-400">{label}</span>
      <span className="text-neutral-100 truncate max-w-[60%] text-right">
        {value}
      </span>
    </div>
  );
}
