// src/components/ui/SelectDuo.jsx
import { forwardRef } from "react";

/**
 * 🔽 Select de THAMES, con label opcional y flechita propia.
 *
 * 🆕 Rediseño "profesional": mismo tratamiento que InputDuo — borde de
 * 1px, esquinas rounded-lg, altura estándar, label en texto normal.
 *
 * Props:
 *   label: texto arriba (opcional)
 *   required: muestra * roja
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
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-[13px] font-medium text-suave dark:text-suave-dark ml-0.5">
          {label}
          {required && <span className="text-duo-rojo ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          className="w-full h-10 rounded-lg border border-linea dark:border-linea-dark
            bg-card dark:bg-card-dark px-3.5 pr-9 text-[14px] font-normal
            text-titulo dark:text-titulo-dark outline-none focus:border-duo-violeta
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
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-suave dark:text-suave-dark text-xs">
          ▼
        </span>
      </div>
    </div>
  );
});

export default SelectDuo;
