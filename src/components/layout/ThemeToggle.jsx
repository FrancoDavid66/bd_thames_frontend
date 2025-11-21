import { useDispatch, useSelector } from "react-redux";
import { FaMoon, FaSun } from "react-icons/fa";
import { toggleTheme } from "../../store/slices/themeSlice";

export default function ThemeToggle({ small = false }) {
  const dispatch = useDispatch();
  const mode = useSelector((state) => state.theme.mode);

  const handleToggle = () => dispatch(toggleTheme());

  const sizeClasses = small ? "h-9 w-9 text-sm" : "h-10 w-10 text-base";

  return (
    <button
      onClick={handleToggle}
      className={`inline-flex items-center justify-center rounded-full bg-brand-200 dark:bg-brand-100 text-brand-100 dark:text-brand-200 hover:scale-105 transition ${sizeClasses}`}
      aria-label="Cambiar tema"
      title={mode === "light" ? "Modo oscuro" : "Modo claro"}
    >
      {mode === "light" ? <FaMoon /> : <FaSun />}
    </button>
  );
}
