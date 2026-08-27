// src/components/solicitudes/CobrarPrimeraCuotaModal.jsx
//
// Post-alta: pregunta si se cobra la 1ª cuota.
//   1) "¿Cobrás la primera cuota ahora?"  (Sí / Ahora no)  ← diseño Duo
//   2) Si Sí → abre el modal de cobro (reutiliza ModalFormaPago de Pagos).
//   3) Al pagar → 🎉 confetti + ofrece descargar el comprobante.
//
// Reutiliza TODA la lógica de pago existente: no crea endpoints ni lógica nueva.

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { HiCash, HiCheckCircle, HiUser, HiOfficeBuilding } from "react-icons/hi";
import toast from "react-hot-toast";

import api from "../../services/api";
import { fetchMediosCobro } from "../../store/slices/pagosSlice";
import { registrarPagoYBalance } from "../../utils/pagos/registrarPagoYBalance";
import ModalFormaPago from "../pagos/ModalesCobro";
import { BotonDescargarPDF } from "../pagos/Comprobante";

import Boton3D from "../ui/Boton3D";

const pad = (n) => String(n).padStart(2, "0");
const hhmm = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const fmtMonto = (n) => {
  const num = Number(n);
  return Number.isFinite(num) ? `$ ${num.toLocaleString("es-AR")}` : null;
};

// 🎉 Confetti seguro: usa canvas-confetti si está instalado; si no, no rompe.
async function lanzarConfetti() {
  try {
    const mod = await import("canvas-confetti");
    const confetti = mod.default || mod;
    const colores = ["#58CC02", "#1CB0F6", "#FFC800", "#CE82FF"];
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors: colores });
    setTimeout(() => confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 }, colors: colores }), 150);
    setTimeout(() => confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 }, colors: colores }), 300);
  } catch {
    /* si no está la librería, seguimos sin confetti */
  }
}

export default function CobrarPrimeraCuotaModal({ open, polizaId, onClose }) {
  const dispatch = useDispatch();
  const mediosCobro = useSelector((s) => s.pagos?.mediosCobro || []);

  const [loading, setLoading] = useState(false);
  const [poliza, setPoliza] = useState(null);
  const [cuota, setCuota] = useState(null);
  const [step, setStep] = useState("preguntar"); // preguntar | cobrar | listo
  const [cuotaPagada, setCuotaPagada] = useState(null);

  // Al abrir: traer la póliza + su cuota 1 (la primera impaga) + medios de cobro.
  useEffect(() => {
    if (!open || !polizaId) return;
    let vivo = true;
    (async () => {
      setLoading(true);
      setStep("preguntar");
      setPoliza(null);
      setCuota(null);
      setCuotaPagada(null);
      try {
        const res = await api.get(`polizas/${polizaId}/`);
        const pol = res?.data || {};

        let cli = pol.cliente;
        const cliId = cli && typeof cli === "object" ? cli.id ?? cli.pk : cli;
        if (cliId && (!cli || typeof cli !== "object" || !(cli.nombre || cli.apellido))) {
          try {
            cli = (await api.get(`clientes/${cliId}/`))?.data || cli;
          } catch {}
        }
        pol.cliente = cli;

        const cuotas = Array.isArray(pol.cuotas) ? pol.cuotas : [];
        const c1 =
          [...cuotas].filter((c) => !c.pagado).sort((a, b) => a.cuota_nro - b.cuota_nro)[0] ||
          [...cuotas].sort((a, b) => a.cuota_nro - b.cuota_nro)[0] ||
          null;

        if (!vivo) return;
        setPoliza(pol);
        setCuota(c1);

        if (pol.oficina) dispatch(fetchMediosCobro({ oficina: String(pol.oficina), activo: true }));
        else dispatch(fetchMediosCobro({ activo: true }));

        if (!c1) toast.error("La póliza se creó, pero no encontré cuotas para cobrar.");
      } catch (e) {
        toast.error("No se pudo cargar la cuota para cobrar.");
        onClose?.();
      } finally {
        if (vivo) setLoading(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [open, polizaId, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  const clienteNombreAp = useMemo(() => {
    const c = poliza?.cliente || {};
    return `${c.nombre || ""} ${c.apellido || ""}`.trim();
  }, [poliza]);

  // 🔢 QUÉ CUOTA SE ESTÁ COBRANDO DE VERDAD.
  //
  //    Arriba se busca la primera IMPAGA, no la número 1. Está bien: en La
  //    Equidad la cuota 1 nace saldada (la cobra la compañía con Pagos Link
  //    al emitir), así que la primera por cobrar es la 2.
  //
  //    🐛 Pero el modal decía "Cuota 1" en cuatro lugares, hardcodeado. El
  //       cliente se iba con un cupón que dice "Cuota 2 de 3" y un recibo
  //       que dice "Cuota 1". Dos números para el mismo pago.
  //
  //    Ahora sale el número real de la cuota. Si por lo que sea no viniera,
  //    cae a 1 — que es el caso de todas las compañías salvo Equidad.
  const nroCuota = cuota?.cuota_nro ?? 1;
  const etiquetaCuota = `Cuota ${nroCuota}`;

  if (!open) return null;

  const handleConfirmPago = async (payload) => {
    const formaPago = payload?.metodo || payload?.forma_pago || "efectivo";

    // 👤 QUIÉN COBRÓ.
    //
    //    🐛 Antes esto no se pasaba, y `registrarPagoYBalance` lo valida:
    //         if (!responsableEmpleadoId) throw new Error("Falta elegir quién cobra");
    //       Con lo cual el cobro post-alta SIEMPRE moría en ese throw. El
    //       modal pedía el responsable, el operador lo elegía… y el dato se
    //       tiraba dos líneas después. Salía "Error al registrar el pago" sin
    //       decir por qué.
    //
    //    Se busca en varios nombres porque el modal de cobro puede devolverlo
    //    de distintas formas según por dónde se abra. Mejor probar cuatro
    //    claves que asumir una y volver a romper en silencio.
    const responsableId =
      payload?.responsable_empleado ??
      payload?.responsable_empleado_id ??
      payload?.empleado_id ??
      payload?.responsable_id ??
      payload?.responsable?.id;

    const responsableNombre =
      payload?.responsable_nombre ||
      payload?.responsable?.nombre ||
      payload?.empleado_nombre ||
      "";

    await registrarPagoYBalance({
      dispatch,
      cuota,
      poliza,
      formaPago,
      monto: payload?.monto,
      responsableEmpleadoId: responsableId,
      // ⚠️ false a propósito: el backend YA crea el ingreso solo (señal
      //    crear_ingreso_automatico al registrar el Pago).
      registrarEnBalance: false,
      extraData: {
        destino_cuenta: payload?.destino_cuenta || "",
        enviado_por: payload?.enviado_por || "",
        cuit_remitente: payload?.cuit_remitente || "",
        nro_operacion: payload?.nro_operacion || "",
        observaciones: payload?.observaciones || "",
        medio_cobro_id: payload?.medio_cobro_id || undefined,
      },
      onSuccess: () => {
        const ahora = new Date();
        setCuotaPagada({
          ...cuota,
          pagado: true,
          fecha_pago: payload?.fecha_pago || todayISO(),
          pago_registrado_en: ahora.toISOString(),
          monto: payload?.monto ?? cuota?.monto,
          forma_pago: formaPago,
          // 💸 LOS DATOS DE LA TRANSFERENCIA VIAJAN AL COMPROBANTE.
          //
          //    Se cargan en el modal de cobro y se mandan al backend, pero
          //    antes se quedaban ahí: el recibo que se llevaba el cliente no
          //    decía el número de operación ni quién había transferido.
          //
          //    Y ese número es lo único que ata un movimiento del extracto a
          //    un cliente. Cuando aparece una transferencia sin identificar,
          //    sin él no hay forma de saber de quién era.
          //
          //    Van desde acá y no desde la respuesta del backend porque el
          //    comprobante se imprime en el momento, con lo que se acaba de
          //    tipear. Si el guardado falla, el papel igual sale bien.
          nro_operacion: payload?.nro_operacion || "",
          enviado_por: payload?.enviado_por || "",
          cuit_remitente: payload?.cuit_remitente || "",
          billetera: payload?.destino_cuenta || "",
          responsable_nombre: responsableNombre,
          pago_hm: hhmm(),
          pago_hm_full: `${ahora.toLocaleDateString("es-AR")} ${hhmm()}`,
        });
        setStep("listo");
        lanzarConfetti(); // 🎉
      },
    });
  };

  const montoCuota = fmtMonto(cuota?.monto);

  return (
    <>
      {/* ── Paso 1: preguntar (diseño Duo) ── */}
      <AnimatePresence>
        {step === "preguntar" && (
          <motion.div
            className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onClose?.()}
          >
            <motion.div
              className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark shadow-2xl overflow-hidden"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-center">
                {/* Ícono grande */}
                <motion.div
                  className="mx-auto mb-4 h-20 w-20 rounded-3xl bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] border-2 border-duo-verde flex items-center justify-center"
                  initial={{ scale: 0.6, rotate: -8 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 12, stiffness: 200 }}
                >
                  <HiCash className="text-duo-verde-sombra dark:text-duo-verde text-5xl" />
                </motion.div>

                <h3 className="text-xl font-black text-titulo dark:text-titulo-dark">Alta creada ✅</h3>
                <p className="text-[13px] font-bold text-suave dark:text-suave-dark mt-1 mb-4">
                  {cuota ? `¿Cobrás la ${etiquetaCuota.toLowerCase()} ahora?` : "¿Cobrás la primera cuota ahora?"}
                </p>

                {/* Tarjeta con datos de la cuota EN GRANDE */}
                <div className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4 mb-5 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-suave dark:text-suave-dark">
                      {etiquetaCuota}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-duo-azul bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] px-2 py-0.5 rounded-full">
                      <HiOfficeBuilding /> {poliza?.compania || "—"}
                    </span>
                  </div>
                  <div className="text-3xl font-black text-titulo dark:text-titulo-dark leading-none">
                    {montoCuota || "$ a definir"}
                  </div>
                  {clienteNombreAp && (
                    <div className="flex items-center gap-1.5 text-[12px] font-bold text-suave dark:text-suave-dark mt-2">
                      <HiUser /> {clienteNombreAp}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2.5">
                  <Boton3D variant="verde" full size="lg" disabled={loading || !cuota} onClick={() => setStep("cobrar")}>
                    <HiCash /> {loading ? "Cargando…" : "Sí, cobrar ahora"}
                  </Boton3D>
                  <Boton3D variant="blanco" full onClick={() => onClose?.()}>
                    Ahora no
                  </Boton3D>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Paso 2: cobro (reutiliza ModalFormaPago de Pagos, sin tocar) ── */}
      <ModalFormaPago
        isOpen={step === "cobrar"}
        onClose={() => setStep("preguntar")}
        onConfirm={handleConfirmPago}
        defaultMonto={cuota?.monto}
        title={`Cobrar ${etiquetaCuota.toLowerCase()}`}
        mediosCobro={mediosCobro}
        clienteNombreApellido={clienteNombreAp}
        clienteDni={poliza?.cliente?.dni || poliza?.cliente?.dni_cuit_cuil || ""}
        polizaCompania={poliza?.compania || ""}
        polizaCobertura={poliza?.cobertura || ""}
        pagoCuota={etiquetaCuota}
      />

      {/* ── Paso 3: listo + comprobante (diseño Duo + confetti) ── */}
      <AnimatePresence>
        {step === "listo" && (
          <motion.div
            className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onClose?.()}
          >
            <motion.div
              className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark shadow-2xl overflow-hidden text-center"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <motion.div
                  className="mx-auto mb-4 h-24 w-24 rounded-full bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] border-2 border-duo-verde flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 10, stiffness: 180 }}
                >
                  <HiCheckCircle className="text-duo-verde-sombra dark:text-duo-verde text-6xl" />
                </motion.div>

                <h3 className="text-2xl font-black text-titulo dark:text-titulo-dark mb-1">¡Cuota cobrada! 🎉</h3>
                {fmtMonto(cuotaPagada?.monto) && (
                  <p className="text-[15px] font-black text-duo-verde-sombra dark:text-duo-verde mb-1">
                    {fmtMonto(cuotaPagada?.monto)} · {cuotaPagada?.forma_pago || "efectivo"}
                  </p>
                )}
                <p className="text-[13px] font-bold text-suave dark:text-suave-dark mb-5">
                  Descargá el comprobante para el cliente.
                </p>

                <div className="flex flex-col gap-2.5">
                  <BotonDescargarPDF
                    cliente={poliza?.cliente}
                    poliza={poliza}
                    cuota={cuotaPagada}
                    label="Descargar comprobante"
                    className="w-full justify-center"
                  />
                  <Boton3D variant="blanco" full onClick={() => onClose?.()}>
                    Cerrar
                  </Boton3D>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}