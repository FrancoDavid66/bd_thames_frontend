// src/components/ui/InputDuo.jsx
import { forwardRef } from "react";

/**
 * ⌨️ Input de THAMES, con label opcional, icono e error.
 *
 * 🆕 Rediseño "profesional": borde de 1px (antes 3px), esquinas rounded-lg
 * (antes rounded-2xl) y una altura más estándar (antes h-13 = 52px, muy
 * alto). El label pasa de MAYÚSCULA+negrita a texto normal en gris medio.
 *
 * Props:
 *   label: texto arriba del input (opcional)
 *   required: muestra * roja junto al label
 *   icon: elemento/ícono a la izquierda (opcional)
 *   error: string de error a mostrar abajo en rojo (opcional)
 *   ...resto: type, value, onChange, placeholder, name, etc.
 *
 * Ejemplo:
 *   <InputDuo label="Teléfono" required value={tel} onChange={...} icon={<HiPhone/>} />
 */
const InputDuo = forwardRef(function InputDuo(
  { label, required = false, icon = null, error = null, className = "", ...rest },
  ref
) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-[13px] font-medium text-suave dark:text-suave-dark ml-0.5">
          {label}
          {required && <span className="text-duo-rojo ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-suave dark:text-suave-dark text-base pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={`w-full h-10 rounded-lg border bg-card dark:bg-card-dark
            text-[14px] font-normal text-titulo dark:text-titulo-dark
            placeholder:text-suave dark:placeholder:text-suave-dark
            outline-none transition-colors [color-scheme:light] dark:[color-scheme:dark]
            ${icon ? "pl-10 pr-3.5" : "px-3.5"}
            ${error ? "border-duo-rojo" : "border-linea dark:border-linea-dark focus:border-duo-violeta"}`}
          {...rest}
        />
      </div>
      {error && <span className="text-[12px] font-medium text-duo-rojo ml-0.5">{error}</span>}
    </div>
  );
});

export default InputDuo;
