/* src/utils/pagos/registrarPagoYBalance.js — Reemplaza TODO el archivo con esta versión */
import { marcarCuotaComoPagada } from "../../store/slices/pagosSlice";
import { toast } from "react-hot-toast";

/**
 * Flujo completo en el front:
 * 1) Marca la cuota como pagada (PATCH /cuotas/{id}/pagar/) con el flag
 *    `registrar_en_balance`. El backend, al registrar el Pago, crea el
 *    Ingreso en "balanzes" AUTOMÁTICAMENTE (señal `crear_ingreso_automatico`).
 *
 * ⚠️ IMPORTANTE: el front YA NO hace un POST /ingresos aparte.
 *    Antes había un "paso 2" que creaba el Ingreso a mano desde acá y eso
 *    DUPLICABA el ingreso en balances (el backend ya lo crea solo).
 *    Ahora el front solo marca la cuota pagada; el ingreso lo hace el backend.
 *
 * @param {Object} options
 * @param {Function} options.dispatch - dispatch de Redux (obligatorio)
 * @param {Object} options.cuota      - cuota a marcar como pagada (obligatorio)
 * @param {Object} options.poliza     - póliza asociada (obligatorio)
 * @param {string} options.formaPago  - "efectivo" | "transferencia" (obligatorio)
 * @param {number|string} options.monto - monto pagado (obligatorio > 0)
 * @param {number|string} [options.responsableEmpleadoId] - quién cobró (obligatorio)
 * @param {boolean} [options.registrarEnBalance=true] - si el backend crea el Ingreso
 * @param {Function} [options.onSuccess] - callback opcional al finalizar (si todo ok)
 */
export const registrarPagoYBalance = async ({
  dispatch,
  cuota,
  poliza,
  formaPago,
  monto,
  responsableEmpleadoId,
  registrarEnBalance = true,
  extraData = {},       // 🔑 datos extra del wizard (cuit, nro_op, billetera, etc.)
  onSuccess,
}) => {
  // --- Helpers locales ---
  const todayISO = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const toAmount = (val) => {
    const n = Number.parseFloat(val);
    return Number.isFinite(n) ? Number(n.toFixed(2)) : NaN;
  };

  try {
    if (!dispatch) throw new Error("dispatch es requerido");
    if (!cuota?.id) throw new Error("Falta la cuota");
    if (!poliza?.numero_poliza) throw new Error("Falta la póliza");
    if (!formaPago || !["efectivo", "transferencia"].includes(formaPago))
      throw new Error("Forma de pago inválida");
    const montoFinal = toAmount(monto);
    if (!montoFinal || montoFinal <= 0) throw new Error("Monto inválido");
    if (!responsableEmpleadoId) throw new Error("Falta elegir quién cobra");


    const fechaPago = todayISO();

    // ── ÚNICO PASO: Marcar cuota como pagada — con todos los datos del wizard ──
    //    El backend crea el Pago y, por la señal, el Ingreso en balances.
    await dispatch(
      marcarCuotaComoPagada({
        id: cuota.id,
        forma_pago: formaPago,
        monto: montoFinal,
        fecha_pago: fechaPago,
        // 🆕 Quién cobró
        responsable_empleado: responsableEmpleadoId,
        // 🔑 Datos de transferencia del wizard
        destino_cuenta:  extraData?.destino_cuenta  || "",
        enviado_por:     extraData?.enviado_por      || "",
        cuit_remitente:  extraData?.cuit_remitente   || "",
        nro_operacion:   extraData?.nro_operacion    || "",
        observaciones:   extraData?.observaciones    || "",
        medio_cobro_id:  extraData?.medio_cobro_id   || undefined,
        // El backend usa este flag para decidir si crea el Ingreso.
        registrar_en_balance: registrarEnBalance,
      })
    ).unwrap();

    toast.success("✅ Cuota pagada y registrada en balances");

    // Callback de éxito
    onSuccess?.();
  } catch (error) {
    // 🔎 EL DETALLE VA A LA CONSOLA, SIEMPRE.
    //
    //    Las validaciones de arriba tiran mensajes claros ("Falta elegir
    //    quién cobra"), pero el toast se los come en dos segundos y el que
    //    atiende solo ve "no se pudo cobrar". Un cobro que falla sin dejar
    //    rastro se reporta como "la app anda mal" y no hay por dónde empezar.
    //
    //    Acá queda qué llegó y qué faltaba, con nombre y apellido.
    console.error("[registrarPagoYBalance] falló:", error?.message || error, {
      cuota_id: cuota?.id,
      poliza: poliza?.numero_poliza,
      forma_pago: formaPago,
      monto,
      responsable: responsableEmpleadoId ?? "(no vino)",
    });
    toast.error(error?.message || "❌ Error al registrar el pago");
  }
};