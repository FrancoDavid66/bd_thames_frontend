// src/components/ui/Boton3D.jsx
import { forwardRef } from "react";

/**
 * 🔘 Botón de THAMES.
 *
 * 🆕 Rediseño "profesional": se sacó el efecto 3D de Duolingo (el borde
 * grueso de abajo que desaparecía al apretar). Ahora es plano, con una
 * transición de color suave y un achique sutil al tocar — el mismo
 * lenguaje que usan Stripe/Linear, no un botón de juego.
 *
 * El nombre del archivo y los props quedan iguales a propósito: así
 * TODOS los <Boton3D variant="verde"> que ya existen en el resto de la
 * app se actualizan solos, sin tener que tocar cada pantalla.
 *
 * Props:
 *   variant: "verde" | "azul" | "rojo" | "amarillo" | "blanco" | "violeta"  (default "verde")
 *   size:    "sm" | "md" | "lg"                                             (default "md")
 *   full:    boolean → ocupa todo el ancho
 *   ...resto: onClick, type, disabled, etc.
 *
 * Ejemplo: <Boton3D variant="violeta" onClick={...}>+ Nuevo</Boton3D>
 */
const VARIANTES = {
  verde:    "bg-duo-verde text-white hover:bg-duo-verde-sombra",
  azul:     "bg-duo-azul text-white hover:bg-duo-azul-sombra",
  rojo:     "bg-duo-rojo text-white hover:bg-duo-rojo-sombra",
  amarillo: "bg-duo-amarillo text-white hover:bg-duo-amarillo-sombra",
  violeta:  "bg-duo-violeta text-white hover:bg-duo-violeta-sombra",
  blanco:   "bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark border border-linea dark:border-linea-dark hover:bg-surface dark:hover:bg-surface-dark",
};

const TAMANOS = {
  sm: "text-[13px] px-3.5 py-2 rounded-lg",
  md: "text-[14px] px-4 py-2.5 rounded-lg",
  lg: "text-[15px] px-5 py-3 rounded-lg",
};

const Boton3D = forwardRef(function Boton3D(
  { variant = "verde", size = "md", full = false, className = "", children, ...rest },
  ref
) {
  const v = VARIANTES[variant] || VARIANTES.verde;
  const s = TAMANOS[size] || TAMANOS.md;
  return (
    <button
      ref={ref}
      className={`font-semibold select-none
        transition-colors duration-150 active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        inline-flex items-center justify-center gap-2 cursor-pointer
        ${v} ${s} ${full ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});

export default Boton3D;
