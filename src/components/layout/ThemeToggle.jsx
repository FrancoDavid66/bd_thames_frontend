// src/components/layout/ThemeToggle.jsx
import { FaMoon, FaSun } from "react-icons/fa";
// 🎨 Ahora usa el motor único de tema (antes usaba el themeSlice de Redux).
import { useTheme } from "../../context/ThemeContext";

export default function ThemeToggle({ small = false }) {
  const { isDark, toggleTheme } = useTheme();

  const sizeClasses = small ? "h-9 w-9 text-sm" : "h-10 w-10 text-base";

  return (
    <button
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center rounded-full border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-tarjeta-claro dark:text-duo-amarillo transition hover:border-duo-amarillo hover:text-duo-amarillo-sombra dark:hover:text-duo-amarillo ${sizeClasses}`}
      aria-label="Cambiar tema"
      title={isDark ? "Modo claro" : "Modo oscuro"}
    >
      {isDark ? <FaSun /> : <FaMoon />}
    </button>
  );
}
