// src/components/balanzes/EnviarBalanceDiarioButton.jsx
import { useEffect } from "react";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { HiPaperAirplane } from "react-icons/hi";

import {
  enviarBalanceWhatsapp,
  clearEnvioState,
} from "../../store/slices/balanceSlice";

const EnviarBalanceDiarioButton = ({
  fecha, // opcional 'YYYY-MM-DD'
  destinatario, // opcional
  oficina, // 🚀 NUEVO: para enviar el balance de una sucursal específica (Admin)
  className = "",
}) => {
  const dispatch = useDispatch();
  const envioStatus = useSelector((s) => s.balance.envioStatus);
  const envioError = useSelector((s) => s.balance.envioError);
  const mensajeEnviado = useSelector((s) => s.balance.mensajeEnviado);

  const handleEnviar = () => {
    if (envioStatus === "loading") return; // evita doble click
    const hoyAR = fecha || dayjs().format("YYYY-MM-DD"); // enviamos fecha explícita
    
    // 🚀 Despachamos también la oficina al thunk
    dispatch(enviarBalanceWhatsapp({ fecha: hoyAR, destinatario, oficina }));
  };

  useEffect(() => {
    if (envioStatus === "succeeded" && mensajeEnviado) {
      toast.success(mensajeEnviado);
      dispatch(clearEnvioState());
    }
    if (envioStatus === "failed" && envioError) {
      toast.error(envioError);
      dispatch(clearEnvioState());
    }
  }, [envioStatus, envioError, mensajeEnviado, dispatch]);

  const isLoading = envioStatus === "loading";

  return (
    <button
      type="button"
      onClick={handleEnviar}
      disabled={isLoading}
      aria-busy={isLoading}
      aria-live="polite"
      title="Enviar resumen de ingresos/egresos por WhatsApp"
      className={`
        inline-flex items-center justify-center gap-2 w-full sm:w-auto
        h-10 sm:h-11 px-4 sm:px-5 rounded-2xl
        text-xs sm:text-sm font-bold tracking-wide
        shadow-lg shadow-emerald-500/20
        border border-emerald-400/50
        text-white
        transition-all active:scale-[0.98]
        focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950
        ${
          isLoading
            ? "bg-emerald-600/80 cursor-not-allowed opacity-80"
            : "bg-emerald-500 hover:bg-emerald-400 hover:shadow-emerald-500/30"
        }
        ${className}
      `}
    >
      <HiPaperAirplane
        className={`text-base transition-transform ${
          isLoading ? "animate-pulse opacity-90 -translate-y-0.5 translate-x-0.5" : "rotate-90 sm:rotate-0"
        }`}
      />
      <span>{isLoading ? "Enviando…" : "Enviar balance por WhatsApp"}</span>
    </button>
  );
};

export default EnviarBalanceDiarioButton;