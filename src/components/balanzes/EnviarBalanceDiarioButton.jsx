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
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-semibold shadow-sm text-neutral-100 transition
        ${isLoading ? "bg-neutral-400 cursor-not-allowed opacity-90" : "bg-primary-500 hover:bg-primary-600"}
        ${className}`}
    >
      <HiPaperAirplane className={isLoading ? "opacity-80" : ""} />
      {isLoading ? "Enviando..." : "Enviar balance diario"}
    </button>
  );
};

export default EnviarBalanceDiarioButton;
