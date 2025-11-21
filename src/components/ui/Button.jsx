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
      solid: "bg-gray-800 hover:bg-gray-700 text-white border border-gray-700",
      outline: "border border-gray-700 hover:bg-gray-800 text-gray-100",
      ghost: "hover:bg-gray-800 text-gray-100",
    },
    primary: {
      solid: "bg-primary-400 hover:opacity-90 text-neutral-900",
      outline: "border border-primary-400 text-primary-300 hover:bg-primary-400/10",
      ghost: "text-primary-300 hover:bg-primary-400/10",
    },
    danger: {
      solid: "bg-red-600 hover:bg-red-700 text-white",
      outline: "border border-red-600 text-red-300 hover:bg-red-600/10",
      ghost: "text-red-300 hover:bg-red-600/10",
    },
    success: {
      solid: "bg-emerald-600 hover:bg-emerald-700 text-white",
      outline: "border border-emerald-600 text-emerald-300 hover:bg-emerald-600/10",
      ghost: "text-emerald-300 hover:bg-emerald-600/10",
    },
  };
  const base = "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm";
  return <Comp className={`${base} ${tones[tone][variant]} ${className}`} {...props} />;
}
