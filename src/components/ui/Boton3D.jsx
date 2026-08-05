// src/components/ui/Boton3D.jsx
import { forwardRef } from "react";

/**
 * 🦉 Botón 3D estilo Duolingo (la firma).
 * El borde inferior (shadow) simula grosor físico; al apretar, el botón baja
 * y la sombra desaparece → sensación de "botón real que se hunde".
 *
 * Props:
 *   variant: "verde" | "azul" | "rojo" | "amarillo" | "blanco" | "violeta"  (default "verde")
 *   size:    "sm" | "md" | "lg"                                             (default "md")
 *   full:    boolean → ocupa todo el ancho
 *   ...resto: onClick, type, disabled, etc.
 *
 * Ejemplo: <Boton3D variant="azul" onClick={...}>+ Nuevo</Boton3D>
 */
const VARIANTES = {
  verde:    "bg-duo-verde text-white shadow-[0_5px_0_var(--color-duo-verde-sombra)] active:shadow-[0_0_0_var(--color-duo-verde-sombra)]",
  azul:     "bg-duo-azul text-white shadow-[0_5px_0_var(--color-duo-azul-sombra)] active:shadow-[0_0_0_var(--color-duo-azul-sombra)]",
  rojo:     "bg-duo-rojo text-white shadow-[0_5px_0_var(--color-duo-rojo-sombra)] active:shadow-[0_0_0_var(--color-duo-rojo-sombra)]",
  amarillo: "bg-duo-amarillo text-duo-texto shadow-[0_5px_0_var(--color-duo-amarillo-sombra)] active:shadow-[0_0_0_var(--color-duo-amarillo-sombra)]",
  violeta:  "bg-duo-violeta text-white shadow-[0_5px_0_var(--color-duo-violeta-sombra)] active:shadow-[0_0_0_var(--color-duo-violeta-sombra)]",
  blanco:   "bg-card dark:bg-card-dark text-duo-azul border-2 border-linea dark:border-linea-dark shadow-[0_5px_0_var(--color-duo-linea)] dark:shadow-[0_5px_0_var(--color-linea-dark)] active:shadow-[0_0_0_var(--color-duo-linea)]",
};

const TAMANOS = {
  sm: "text-[12px] px-4 py-2 rounded-xl",
  md: "text-[15px] px-6 py-3.5 rounded-2xl",
  lg: "text-[17px] px-8 py-4 rounded-2xl",
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
      className={`relative top-0 active:top-[5px] transition-all duration-75
        font-extrabold uppercase tracking-wide select-none
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:top-0
        inline-flex items-center justify-center gap-2 cursor-pointer
        ${v} ${s} ${full ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});

export default Boton3D;
