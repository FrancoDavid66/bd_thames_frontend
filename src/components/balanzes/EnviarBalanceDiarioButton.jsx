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
  className = "",
}) => {
  const dispatch = useDispatch();
  const envioStatus = useSelector((s) => s.balance.envioStatus);
  const envioError = useSelector((s) => s.balance.envioError);
  const mensajeEnviado = useSelector((s) => s.balance.mensajeEnviado);

  const handleEnviar = () => {
    if (envioStatus === "loading") return; // evita doble click
    const hoyAR = fecha || dayjs().format("YYYY-MM-DD"); // enviamos fecha explícita
    dispatch(enviarBalanceWhatsapp({ fecha: hoyAR, destinatario }));
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
        inline-flex items-center justify-center gap-2
        h-11 px-4 sm:px-5 rounded-2xl
        text-xs sm:text-sm font-semibold tracking-wide
        shadow-md shadow-emerald-500/30
        border border-emerald-300/60
        text-white
        transition
        focus:outline-none focus:ring-2 focus:ring-emerald-400/80 focus:ring-offset-2 focus:ring-offset-zinc-900
        ${
          isLoading
            ? "bg-emerald-700 cursor-not-allowed opacity-80"
            : "bg-emerald-500 hover:bg-emerald-400"
        }
        ${className}
      `}
    >
      <HiPaperAirplane
        className={`text-sm sm:text-base ${
          isLoading ? "animate-pulse opacity-90" : ""
        }`}
      />
      {isLoading ? "Enviando…" : "Enviar balance por WhatsApp"}
    </button>
  );
};

export default EnviarBalanceDiarioButton;
