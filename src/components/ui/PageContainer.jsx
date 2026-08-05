// src/components/ui/PageContainer.jsx
/**
 * 📐 Contenedor estándar de página para THAMES.
 * Da a TODAS las páginas el mismo ancho máximo, padding y centrado.
 * Así todas se ven parejas y, si querés cambiar la medida, la tocás en UN solo lugar.
 *
 * Incluye el fondo de página (surface) y el color de texto base, en claro + oscuro.
 *
 * Props:
 *   width: ancho máximo → "sm" | "md" | "lg" | "xl" | "full"   (default "xl" = 1536px)
 *          Usá "md"/"lg" para páginas que quieras más angostas (ej: un formulario centrado).
 *   className: clases extra para el contenido interno (opcional)
 *   bare: si es true, NO pone fondo ni min-height (útil si la página ya los maneja)
 *   children: el contenido de la página
 *
 * Ejemplo:
 *   export default function ClientesPage() {
 *     return (
 *       <PageContainer>
 *         ...todo el contenido de la página...
 *       </PageContainer>
 *     );
 *   }
 *
 *   // Página más angosta:
 *   <PageContainer width="md"> ... </PageContainer>
 */
const ANCHOS = {
  sm: "max-w-3xl",        // ~768px  — formularios/contenido angosto
  md: "max-w-5xl",        // ~1024px
  lg: "max-w-7xl",        // ~1280px — el clásico
  xl: "max-w-[1536px]",   // 1536px  — ESTÁNDAR THAMES (tablas anchas, dashboards)
  full: "max-w-full",     // sin límite
};

export default function PageContainer({ width = "xl", bare = false, className = "", children }) {
  const ancho = ANCHOS[width] || ANCHOS.xl;

  return (
    <div
      className={
        bare
          ? ""
          : "min-h-[100dvh] bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark"
      }
    >
      <div className={`${ancho} mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 pb-24 ${className}`}>
        {children}
      </div>
    </div>
  );
}