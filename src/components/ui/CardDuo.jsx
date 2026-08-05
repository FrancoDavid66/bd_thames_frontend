// src/components/ui/CardDuo.jsx
/**
 * 🦉 Tarjeta redonda estilo Duolingo.
 * Bordes muy redondeados + borde de 2px + una sombra inferior sutil (0 2px 0)
 * que le da la sensación "física" de las cards de Duo. Funciona en claro/oscuro.
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
      className={`bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark
        rounded-3xl shadow-[0_2px_0_var(--color-duo-linea)] dark:shadow-[0_2px_0_var(--color-linea-dark)]
        ${hover ? "transition-transform duration-100 hover:-translate-y-0.5 cursor-pointer" : ""}
        ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
