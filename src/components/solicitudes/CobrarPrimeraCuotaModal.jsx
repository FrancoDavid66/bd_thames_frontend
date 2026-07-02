// src/components/solicitudes/CobrarPrimeraCuotaModal.jsx
//
// Post-alta: pregunta si se cobra la 1ª cuota.
//   1) "¿Cobrás la primera cuota ahora?"  (Sí / Ahora no)
//   2) Si Sí → abre el modal de cobro (reutiliza ModalFormaPago).
//   3) Al pagar → ofrece descargar el comprobante (reutiliza DescargarFactura).
//
// Reutiliza TODO lo que ya existe: no crea endpoints ni lógica de pago nueva.

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { HiCash, HiCheckCircle } from "react-icons/hi";
import toast from "react-hot-toast";

import api from "../../services/api";
import { fetchMediosCobro } from "../../store/slices/pagosSlice";
import { registrarPagoYBalance } from "../../utils/pagos/registrarPagoYBalance";
import ModalFormaPago from "../pagos/ModalFormaPago";
import DescargarFactura from "../pagos/DescargarFactura";

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

        // El cliente puede venir como ID o como objeto: si falta el nombre, lo buscamos.
        let cli = pol.cliente;
        const cliId = cli && typeof cli === "object" ? cli.id ?? cli.pk : cli;
        if (cliId && (!cli || typeof cli !== "object" || !(cli.nombre || cli.apellido))) {
          try {
            cli = (await api.get(`clientes/${cliId}/`))?.data || cli;
          } catch {
            /* seguimos con lo que haya */
          }
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

  if (!open) return null;

  const handleConfirmPago = async (payload) => {
    const formaPago = payload?.metodo || payload?.forma_pago || "efectivo";
    await registrarPagoYBalance({
      dispatch,
      cuota,
      poliza,
      formaPago,
      monto: payload?.monto,
      // ⚠️ false a propósito: el backend YA crea el ingreso solo (señal
      //    crear_ingreso_automatico al registrar el Pago). Si lo pedimos otra vez
      //    acá, se duplica y falla (por eso saltaba el toast rojo).
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
          // 🆕 Timestamp COMPLETO (con hora). El PDF lo usa como fecha de pago.
          //    Sin la hora, "2026-07-01" se lee como UTC 00:00 y en Argentina (UTC-3)
          //    se corre al día anterior 21:00. Con hora, muestra HOY y cobertura = mañana.
          pago_registrado_en: ahora.toISOString(),
          monto: payload?.monto ?? cuota?.monto,
          forma_pago: formaPago,
          pago_hm: hhmm(),
          pago_hm_full: `${ahora.toLocaleDateString("es-AR")} ${hhmm()}`,
        });
        setStep("listo");
      },
    });
  };

  return (
    <>
      {/* ── Paso 1: preguntar ── */}
      <AnimatePresence>
        {step === "preguntar" && (
          <motion.div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-sm rounded-3xl bg-slate-900 border border-white/10 shadow-2xl p-6"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="p-2.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/20">
                  <HiCash className="text-indigo-300 text-xl" />
                </span>
                <h3 className="text-white font-black text-lg">Solicitud creada ✅</h3>
              </div>
              <p className="text-sm text-slate-300 mb-1">¿Querés cobrar la primera cuota ahora?</p>
              {cuota && (
                <p className="text-[13px] text-slate-400 mb-5">
                  Cuota 1 · {fmtMonto(cuota.monto) || "monto a definir"}
                </p>
              )}
              {!cuota && <div className="mb-5" />}
              <div className="flex gap-2.5">
                <button
                  onClick={() => onClose?.()}
                  className="flex-1 py-3 rounded-2xl bg-white/5 text-white/70 font-bold text-sm hover:bg-white/10 transition"
                >
                  Ahora no
                </button>
                <button
                  disabled={loading || !cuota}
                  onClick={() => setStep("cobrar")}
                  className="flex-1 py-3 rounded-2xl bg-indigo-500 text-white font-black text-sm hover:bg-indigo-400 transition disabled:opacity-40"
                >
                  {loading ? "Cargando…" : "Sí, cobrar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Paso 2: cobro (reutiliza ModalFormaPago) ── */}
      <ModalFormaPago
        isOpen={step === "cobrar"}
        onClose={() => setStep("preguntar")}
        onConfirm={handleConfirmPago}
        defaultMonto={cuota?.monto}
        title="Cobrar 1ª cuota"
        mediosCobro={mediosCobro}
        clienteNombreApellido={clienteNombreAp}
        clienteDni={poliza?.cliente?.dni || poliza?.cliente?.dni_cuit_cuil || ""}
        polizaCompania={poliza?.compania || ""}
        polizaCobertura={poliza?.cobertura || ""}
        pagoCuota="Cuota 1"
      />

      {/* ── Paso 3: listo + comprobante (reutiliza DescargarFactura) ── */}
      <AnimatePresence>
        {step === "listo" && (
          <motion.div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-sm rounded-3xl bg-slate-900 border border-white/10 shadow-2xl p-6 text-center"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
            >
              <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <HiCheckCircle className="text-emerald-400 text-3xl" />
              </div>
              <h3 className="text-white font-black text-lg mb-1">¡Cuota cobrada!</h3>
              <p className="text-[13px] text-slate-400 mb-5">
                Descargá el comprobante para el cliente.
              </p>
              <div className="flex flex-col gap-2.5">
                <DescargarFactura
                  cliente={poliza?.cliente}
                  poliza={poliza}
                  cuota={cuotaPagada}
                  label="Descargar comprobante"
                  tone="primary"
                  className="w-full justify-center"
                />
                <button
                  onClick={() => onClose?.()}
                  className="w-full py-3 rounded-2xl bg-white/5 text-white/70 font-bold text-sm hover:bg-white/10 transition"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}