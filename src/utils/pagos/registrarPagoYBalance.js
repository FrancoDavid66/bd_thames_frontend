/* src/utils/pagos/registrarPagoYBalance.js — Reemplaza TODO el archivo con esta versión */
import { marcarCuotaComoPagada, registrarIngreso } from "../../store/slices/pagosSlice";
import { toast } from "react-hot-toast";

/**
 * Flujo completo en el front:
 * 1) Marca la cuota como pagada (PATCH /cuotas/{id}/pagar/).
 * 2) Registra el ingreso en "balanzes" (POST /ingresos).
 *    - Si el paso 2 falla, la cuota queda pagada igualmente y se avisa.
 *
 * NOTA: Si preferís que el backend haga ambos pasos de una (crear Pago + Ingreso),
 * luego migraremos a un thunk `registrarPago` que use /pagos/registrar/. Por ahora
 * este helper respeta tu slice actual.
 *
 * @param {Object} options
 * @param {Function} options.dispatch - dispatch de Redux (obligatorio)
 * @param {Object} options.cuota      - cuota a marcar como pagada (obligatorio)
 * @param {Object} options.poliza     - póliza asociada (obligatorio)
 * @param {string} options.formaPago  - "efectivo" | "transferencia" (obligatorio)
 * @param {number|string} options.monto - monto pagado (obligatorio > 0)
 * @param {number|string} [options.responsableEmpleadoId] - quién cobró (opcional)
 * @param {boolean} [options.registrarEnBalance=true] - si además crea Ingreso
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

    // 1) Marcar cuota como pagada — con todos los datos del wizard
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
        registrar_en_balance: registrarEnBalance,
      })
    ).unwrap();

    toast.success("✅ Cuota pagada correctamente");

    // 2) Registrar ingreso en balances (opcional)
    if (registrarEnBalance) {
      const clienteNombre = `${poliza?.cliente?.nombre || ""} ${poliza?.cliente?.apellido || ""}`.trim();
      const ingresoData = {
        descripcion: `Pago de cuota #${cuota.cuota_nro} - Póliza ${poliza.numero_poliza}`,
        monto: montoFinal,
        categoria: "Pago de Póliza",
        forma_pago: formaPago,
        pagado_por: clienteNombre || "Cliente",
      };

      try {
        await dispatch(registrarIngreso(ingresoData)).unwrap();
        toast.success("✔️ Ingreso registrado en balances");
      } catch (e) {
        console.error("Error registrando ingreso:", e);
        toast.error("El pago se registró, pero falló el ingreso en balances.");
      }
    }

    // 3) Callback de éxito
    onSuccess?.();
  } catch (error) {
    console.error("Error en registrarPagoYBalance:", error);
    toast.error(error?.message || "❌ Error al registrar el pago");
  }
};