// src/components/ui/SelectDuo.jsx
import { forwardRef } from "react";

/**
 * 🔽 Select redondo estilo Duolingo, con label opcional y flechita propia.
 *
 * Props:
 *   label: texto arriba (opcional)
 *   required: muestra * rojo
 *   options: array de { value, label }  (opcional; también podés pasar <option> como children)
 *   placeholder: texto de la opción vacía inicial (opcional)
 *   ...resto: value, onChange, name, disabled, etc.
 *
 * Ejemplo:
 *   <SelectDuo label="Sucursal" value={ofi} onChange={...}
 *              options={oficinas.map(o => ({ value:o.id, label:o.nombre }))}
 *              placeholder="Elegí una sucursal" />
 */
const SelectDuo = forwardRef(function SelectDuo(
  { label, required = false, options = null, placeholder = null, className = "", children, ...rest },
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
        <select
          ref={ref}
          className="w-full h-13 rounded-2xl border-[3px] border-linea dark:border-linea-dark
            bg-surface dark:bg-surface-dark px-4 pr-10 text-[15px] font-bold
            text-titulo dark:text-titulo-dark outline-none focus:border-duo-azul
            transition-colors cursor-pointer appearance-none"
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options
            ? options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))
            : children}
        </select>
        <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-suave dark:text-suave-dark text-xs">
          ▼
        </span>
      </div>
    </div>
  );
});

export default SelectDuo;
