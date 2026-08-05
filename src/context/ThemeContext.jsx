// src/context/ThemeContext.jsx
//
// 🎨 MOTOR ÚNICO DE TEMA (claro / oscuro).
//    - Aplica la clase "dark" en <html> (Tailwind usa darkMode: 'class').
//    - Persiste la elección en localStorage.
//    - Default: OSCURO (coherente con el diseño de la app).
//
//    Uso:
//      // en main.jsx:  <ThemeProvider><App/></ThemeProvider>
//      // en cualquier componente:
//      const { theme, isDark, toggleTheme, setTheme } = useTheme();
//
import { createContext, useContext, useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "app.theme"; // "light" | "dark"
const DEFAULT_THEME = "dark";    // 🌙 arranca en oscuro

const ThemeContext = createContext(null);

// Lee el tema guardado; si no hay, usa el default (oscuro).
function leerTemaInicial() {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY);
    // Aceptamos el valor viejo que podía venir con comillas (JSON) o sin ellas.
    const limpio = (guardado || "").replaceAll('"', "").trim().toLowerCase();
    if (limpio === "light" || limpio === "dark") return limpio;
  } catch { /* noop */ }
  return DEFAULT_THEME;
}

// Aplica (o saca) la clase "dark" en el <html>.
function aplicarClase(theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(leerTemaInicial);

  // Cada vez que cambia el tema: aplicar la clase + guardar.
  useEffect(() => {
    aplicarClase(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* noop */ }
  }, [theme]);

  const setTheme = useCallback((nuevo) => {
    if (nuevo === "light" || nuevo === "dark") setThemeState(nuevo);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const value = {
    theme,                    // "light" | "dark"
    isDark: theme === "dark", // booleano cómodo
    setTheme,                 // setTheme("light" | "dark")
    toggleTheme,              // alterna
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Hook para consumir el tema desde cualquier componente.
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Si alguien usa el hook fuera del provider, avisamos claro.
    throw new Error("useTheme() debe usarse dentro de <ThemeProvider>.");
  }
  return ctx;
}