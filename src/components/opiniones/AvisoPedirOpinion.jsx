// src/components/opiniones/AvisoPedirOpinion.jsx
// ============================================================
// ⭐ TARJETITA: «PEDILE LA OPINIÓN AL CLIENTE»
//
// Aparece abajo a la derecha apenas se cobra una cuota (de cualquier pantalla:
// Pagos, ficha del cliente, ficha de la póliza, Panel Portal…). No tapa nada:
// se puede seguir trabajando y cerrarla con la X.
//
// El botón abre WhatsApp (el de la oficina, sin costo) con el mensaje ya
// escrito, de usted, y el link personal del cliente:
//   "¡Muchas gracias, Juan! 🙌 ¿Nos regala un minuto? Cuéntenos cómo lo atendió Sofía hoy: <link>"
//
// Se monta UNA vez en App.jsx. Escucha el evento de utils/opiniones/avisoOpinion.js.
// Si se cobran varias cuotas del mismo cliente, queda una sola tarjeta.
// ============================================================
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LuCopy, LuMessageCircle, LuStar, LuX } from "react-icons/lu";

import { EVENTO_PEDIR_OPINION } from "../../utils/opiniones/avisoOpinion";

const DURACION_MS = 90_000; // se va sola al minuto y medio

export default function AvisoPedirOpinion() {
  const [aviso, setAviso] = useState(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const alRecibir = (ev) => {
      const o = ev?.detail;
      if (!o?.wa_url) return;
      setCopiado(false);
      setAviso({ ...o, _id: Date.now() });
    };
    window.addEventListener(EVENTO_PEDIR_OPINION, alRecibir);
    return () => window.removeEventListener(EVENTO_PEDIR_OPINION, alRecibir);
  }, []);

  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(() => setAviso(null), DURACION_MS);
    return () => clearTimeout(t);
  }, [aviso]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(aviso.mensaje);
      setCopiado(true);
    } catch {
      /* sin portapapeles: no pasa nada */
    }
  };

  const pila = String(aviso?.cliente || "").split(" ")[0];

  return (
    <AnimatePresence>
      {aviso ? (
        <motion.div
          key={aviso._id}
          role="status"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-24 right-3 z-[60] w-[calc(100vw-1.5rem)] max-w-[340px] rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3.5 shadow-xl sm:bottom-6 sm:right-6"
        >
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo">
              <LuStar className="h-5 w-5" fill="currentColor" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold leading-tight text-titulo dark:text-titulo-dark">
                Pedile la opinión{pila ? ` a ${pila}` : ""}
              </p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-suave dark:text-suave-dark">
                {aviso.empleado
                  ? `Que puntúe cómo lo atendió ${aviso.empleado.split(" ")[0]}. Suma para «Mejor atención».`
                  : "Que puntúe la atención y elija quién lo atendió."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAviso(null)}
              className="-mr-1 -mt-1 grid h-8 w-8 flex-none place-items-center rounded-lg text-suave hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Cerrar"
            >
              <LuX className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <a
              href={aviso.wa_url}
              target="_blank"
              rel="noreferrer"
              onClick={() => setTimeout(() => setAviso(null), 400)}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-[14px] font-bold text-[#06240F] hover:bg-[#1EBE5A]"
            >
              <LuMessageCircle className="h-4 w-4" /> Enviar por WhatsApp
            </a>
            <button
              type="button"
              onClick={copiar}
              title="Copiar el mensaje"
              className="flex h-10 items-center gap-1.5 rounded-xl border border-linea dark:border-linea-dark px-3 text-[13px] font-semibold text-titulo dark:text-titulo-dark hover:bg-black/5 dark:hover:bg-white/10"
            >
              <LuCopy className="h-4 w-4" /> {copiado ? "¡Listo!" : "Copiar"}
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
