// src/components/ui/LoaderPantalla.jsx
//
// ⏳ Cortina de carga a pantalla completa.
//
// ── PARA QUÉ ───────────────────────────────────────────────────────────
// Leer un PDF de 19 hojas, recortar los cupones y subirlos a Cloudinary
// tarda entre 5 y 15 segundos. Sin nada en pantalla, el operador cree que
// se colgó: toca de nuevo, sube el archivo dos veces, o cierra el modal a
// mitad de camino.
//
// Esto tapa TODA la pantalla a propósito. No es un spinner chiquito en un
// rincón: es un cartel que dice "esperá, estoy trabajando".
//
// ── LOS PASITOS ────────────────────────────────────────────────────────
// Si le pasás `pasos`, los va marcando de a uno cada `intervalo` ms. No
// están medidos contra el proceso real — son una estimación honesta de por
// dónde va. Sirven para que la espera se sienta corta: ver "Recortando los
// cupones…" es muy distinto a mirar un círculo girar.
//
// Es el mismo truco del lavarropas que muestra "Enjuague / Centrifugado":
// no acelera nada, pero uno sabe que avanza.
//
// Props:
//   visible: boolean
//   titulo:  el texto grande
//   pasos:   array de strings (opcional)
//   intervalo: ms entre pasos (default 1800)
//   tono: "azul" | "verde" | "violeta"  (default "azul")

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const TONOS = {
  azul:    { anillo: "border-duo-azul/25 border-t-duo-azul",       texto: "text-duo-azul" },
  verde:   { anillo: "border-duo-verde/25 border-t-duo-verde",     texto: "text-duo-verde" },
  violeta: { anillo: "border-duo-violeta/25 border-t-duo-violeta", texto: "text-duo-violeta" },
};

export default function LoaderPantalla({
  visible = false,
  titulo = "Procesando…",
  pasos = [],
  intervalo = 1800,
  tono = "violeta",
}) {
  const [i, setI] = useState(0);
  const t = TONOS[tono] || TONOS.violeta;

  useEffect(() => {
    if (!visible || pasos.length <= 1) {
      setI(0);
      return;
    }
    // Se queda en el ÚLTIMO paso si el proceso tarda más de lo estimado.
    // Nunca vuelve al principio: eso daría la sensación de que se reinició.
    const id = setInterval(() => {
      setI((p) => (p + 1 < pasos.length ? p + 1 : p));
    }, intervalo);
    return () => clearInterval(id);
  }, [visible, pasos.length, intervalo]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          // z-[200]: por encima de ModalDuo (z-150). El loader tiene que tapar
          // también el modal desde el que se disparó.
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className={`h-16 w-16 rounded-full border-[5px] animate-spin ${t.anillo}`} />

          <p className="mt-6 text-lg font-black text-white text-center tracking-tight">
            {titulo}
          </p>

          {pasos.length ? (
            <div className="mt-5 w-full max-w-xs space-y-2">
              {pasos.map((p, idx) => {
                const hecho = idx < i;
                const activo = idx === i;
                return (
                  <div
                    key={p}
                    className={`flex items-center gap-2.5 text-[13px] font-bold transition-opacity duration-300 ${
                      activo ? "opacity-100" : hecho ? "opacity-60" : "opacity-25"
                    }`}
                  >
                    <span
                      className={`h-5 w-5 rounded-full shrink-0 flex items-center justify-center text-[11px] ${
                        hecho
                          ? "bg-duo-verde text-white"
                          : activo
                          ? `bg-white/15 ${t.texto}`
                          : "bg-white/10 text-white/40"
                      }`}
                    >
                      {hecho ? "✓" : idx + 1}
                    </span>
                    <span className="text-white">{p}</span>
                  </div>
                );
              })}
            </div>
          ) : null}

          <p className="mt-6 text-[11px] font-bold uppercase tracking-widest text-white/40">
            No cierres esta ventana
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}