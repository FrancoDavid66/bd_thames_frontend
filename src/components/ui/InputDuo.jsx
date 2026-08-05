// src/components/ui/InputDuo.jsx
import { forwardRef } from "react";

/**
 * ⌨️ Input redondo gordo estilo Duolingo, con label opcional, icono e error.
 *
 * Props:
 *   label: texto arriba del input (opcional)
 *   required: muestra * rojo junto al label
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
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label className="text-[11px] font-extrabold uppercase tracking-wide text-suave dark:text-suave-dark ml-1">
          {label}
          {required && <span className="text-duo-rojo ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-suave dark:text-suave-dark text-lg pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={`w-full h-13 rounded-2xl border-[3px] bg-surface dark:bg-surface-dark
            text-[15px] font-bold text-titulo dark:text-titulo-dark
            placeholder:text-suave dark:placeholder:text-suave-dark placeholder:font-normal
            outline-none transition-colors [color-scheme:light] dark:[color-scheme:dark]
            ${icon ? "pl-12 pr-4" : "px-4"}
            ${error ? "border-duo-rojo" : "border-linea dark:border-linea-dark focus:border-duo-azul"}`}
          {...rest}
        />
      </div>
      {error && <span className="text-[11px] font-extrabold text-duo-rojo ml-1">{error}</span>}
    </div>
  );
});

export default InputDuo;
