// src/components/ui/Badge.jsx
/**
 * 🏷️ Badge de estado estilo Duolingo (pastilla redonda con fondo tenue).
 *
 * Props:
 *   tono: "verde" | "amarillo" | "rojo" | "azul" | "violeta" | "neutro"  (default "neutro")
 *   size: "sm" | "md"                                                    (default "md")
 *   children: el texto del badge
 *
 * Ejemplos:
 *   <Badge tono="verde">Completo</Badge>
 *   <Badge tono="rojo">Vencida</Badge>
 *   <Badge tono="amarillo" size="sm">Pendiente</Badge>
 *
 * Helper: estadoATono(estado) mapea un string de estado a su tono.
 */
const TONOS = {
  verde:    "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde",
  amarillo: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo",
  rojo:     "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo",
  azul:     "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul",
  violeta:  "bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta",
  neutro:   "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border border-linea dark:border-linea-dark",
};

const TAMANOS = {
  sm: "text-[9px] px-2 py-0.5",
  md: "text-[11px] px-3 py-1",
};

export default function Badge({ tono = "neutro", size = "md", className = "", children }) {
  const t = TONOS[tono] || TONOS.neutro;
  const s = TAMANOS[size] || TAMANOS.md;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-extrabold uppercase tracking-wide ${t} ${s} ${className}`}>
      {children}
    </span>
  );
}

/**
 * Mapea un texto de estado (del backend) al tono correcto.
 * Reconoce estados de clientes Y de pólizas. No distingue tildes/mayúsculas.
 * Ejemplo: estadoATono("COMPLETO") -> "verde"
 */
export function estadoATono(estado) {
  const v = String(estado ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  if (v.includes("completo") || v.includes("activ") || v.includes("pagad") || v.includes("dia")) return "verde";
  if (v.includes("incompleto") || v.includes("borrador") || v.includes("pendiente") || v.includes("vencer")) return "amarillo";
  if (v.includes("inactiv") || v.includes("vencid") || v.includes("baja") || v.includes("rechaz") || v.includes("error")) return "rojo";
  return "neutro";
}
