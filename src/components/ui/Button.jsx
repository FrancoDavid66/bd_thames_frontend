// src/components/ui/Button.jsx
export default function Button({
  variant = "solid",       // "solid" | "outline" | "ghost"
  tone = "neutral",        // "neutral" | "primary" | "danger" | "success"
  className = "",
  as: Comp = "button",
  ...props
}) {
  const tones = {
    neutral: {
      solid: "bg-titulo dark:bg-titulo-dark text-surface dark:text-surface-dark border border-titulo dark:border-titulo-dark hover:brightness-110",
      outline: "border border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark",
      ghost: "text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark",
    },
    primary: {
      solid: "bg-duo-azul hover:brightness-110 text-white",
      outline: "border border-duo-azul text-duo-azul hover:bg-duo-azul-soft dark:hover:bg-[var(--color-duo-azul-soft-dark)]",
      ghost: "text-duo-azul hover:bg-duo-azul-soft dark:hover:bg-[var(--color-duo-azul-soft-dark)]",
    },
    danger: {
      solid: "bg-duo-rojo hover:brightness-110 text-white",
      outline: "border border-duo-rojo text-duo-rojo hover:bg-duo-rojo-soft dark:hover:bg-[var(--color-duo-rojo-soft-dark)]",
      ghost: "text-duo-rojo hover:bg-duo-rojo-soft dark:hover:bg-[var(--color-duo-rojo-soft-dark)]",
    },
    success: {
      solid: "bg-duo-verde hover:brightness-110 text-white",
      outline: "border border-duo-verde text-duo-verde-sombra dark:text-duo-verde hover:bg-duo-verde-soft dark:hover:bg-[var(--color-duo-verde-soft-dark)]",
      ghost: "text-duo-verde-sombra dark:text-duo-verde hover:bg-duo-verde-soft dark:hover:bg-[var(--color-duo-verde-soft-dark)]",
    },
  };
  const base = "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors";
  return <Comp className={`${base} ${tones[tone][variant]} ${className}`} {...props} />;
}