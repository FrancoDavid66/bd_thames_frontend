// src/components/ui/CardDuo.jsx
/**
 * 🗂️ Tarjeta base de THAMES.
 *
 * 🆕 Rediseño "profesional": borde de 1px (antes 2px) y una sombra apenas
 * perceptible en vez del "borde grueso + sombra plana de 2px" estilo
 * Duolingo. Menos redondeada (antes rounded-3xl). El objetivo es que la
 * tarjeta se note por el borde/sombra, no por gritar con color.
 *
 * Props:
 *   as: etiqueta a renderizar ("div" por defecto; podés pasar "section", "li", etc.)
 *   hover: boolean → agrega el efecto de levantarse al pasar el mouse (para cards clickeables)
 *   className: clases extra
 *
 * Ejemplo: <CardDuo hover onClick={...}>...</CardDuo>
 */
export default function CardDuo({ as: Tag = "div", hover = false, className = "", children, ...rest }) {
  return (
    <Tag
      className={`bg-card dark:bg-card-dark border border-linea dark:border-linea-dark
        rounded-xl shadow-sm
        ${hover ? "transition-shadow duration-150 hover:shadow-md cursor-pointer" : ""}
        ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
