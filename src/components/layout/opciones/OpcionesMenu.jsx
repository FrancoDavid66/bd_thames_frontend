// src/components/layout/opciones/OpcionesMenu.jsx
import { useEffect, useMemo, useState } from "react";
import {
  HiSun,
  HiMoon,
  HiAdjustments,
  HiDesktopComputer,
  HiRefresh,
} from "react-icons/hi";

/* Helpers (persistencia simple en localStorage) */
const LS = {
  get: (k, d) => {
    try {
      const v = localStorage.getItem(k);
      return v !== null ? JSON.parse(v) : d;
    } catch {
      return d;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
  del: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {}
  },
};

const applyTheme = (theme) => {
  const root = document.documentElement;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const useDark = theme === "dark" || (theme === "system" && prefersDark);
  root.classList.toggle("dark", !!useDark);
};

const applyDensity = (density) => {
  document.documentElement.dataset.density = density; // "comfortable" | "compact"
};

const applyFontScale = (scale) => {
  const map = { sm: "14px", md: "16px", lg: "18px" };
  document.documentElement.style.fontSize = map[scale] || "16px";
};

const DEFAULTS = {
  theme: "system",
  density: "comfortable",
  fontScale: "md",
};

export default function OpcionesMenu({ onClose }) {
  const [theme, setTheme] = useState(() => LS.get("app.theme", DEFAULTS.theme));
  const [density, setDensity] = useState(() => LS.get("app.ui.density", DEFAULTS.density));
  const [fontScale, setFontScale] = useState(() => LS.get("app.ui.fontscale", DEFAULTS.fontScale));

  /* Aplicar cambios → DOM + persistencia + evento global */
  useEffect(() => {
    applyTheme(theme);
    LS.set("app.theme", theme);
    window.dispatchEvent(new CustomEvent("settings:changed", { detail: { theme } }));
  }, [theme]);

  useEffect(() => {
    applyDensity(density);
    LS.set("app.ui.density", density);
    window.dispatchEvent(new CustomEvent("settings:changed", { detail: { density } }));
  }, [density]);

  useEffect(() => {
    applyFontScale(fontScale);
    LS.set("app.ui.fontscale", fontScale);
    window.dispatchEvent(new CustomEvent("settings:changed", { detail: { fontScale } }));
  }, [fontScale]);

  const resetAll = () => {
    setTheme(DEFAULTS.theme);
    setDensity(DEFAULTS.density);
    setFontScale(DEFAULTS.fontScale);
    LS.del("app.theme");
    LS.del("app.ui.density");
    LS.del("app.ui.fontscale");
    applyTheme(DEFAULTS.theme);
    applyDensity(DEFAULTS.density);
    applyFontScale(DEFAULTS.fontScale);
    window.dispatchEvent(new CustomEvent("settings:changed", { detail: { reset: true } }));
    onClose?.();
  };

  const themeOptions = useMemo(
    () => [
      { key: "light", label: "Claro", icon: HiSun },
      { key: "dark", label: "Oscuro", icon: HiMoon },
      { key: "system", label: "Sistema", icon: HiDesktopComputer },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Preferencias de tema */}
      <section>
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
          Apariencia
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map(({ key, label, icon: Icon }) => {
            const active = theme === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTheme(key)}
                className={[
                  "flex flex-col items-center justify-center rounded-xl border p-3 text-sm",
                  "transition focus:outline-none focus:ring-2",
                  active
                    ? "border-primary-400 ring-primary-300 dark:border-primary-300"
                    : "border-neutral-200 dark:border-neutral-700",
                ].join(" ")}
              >
                <Icon className="text-xl mb-1" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Densidad */}
      <section>
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
          Densidad
        </h3>
        <div className="inline-flex rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          {[
            { key: "comfortable", label: "Cómoda" },
            { key: "compact", label: "Compacta" },
          ].map(({ key, label }, idx) => {
            const active = density === key;
            return (
              <button
                key={key}
                onClick={() => setDensity(key)}
                className={[
                  "px-4 py-2 text-sm",
                  idx === 0 ? "" : "border-l border-neutral-200 dark:border-neutral-700",
                  active
                    ? "bg-primary-50 dark:bg-neutral-800 text-primary-700 dark:text-neutral-100"
                    : "text-neutral-700 dark:text-neutral-200",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Tamaño de fuente */}
      <section>
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
          Tamaño de fuente
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: "sm", label: "Pequeña" },
            { key: "md", label: "Normal" },
            { key: "lg", label: "Grande" },
          ].map(({ key, label }) => {
            const active = fontScale === key;
            return (
              <button
                key={key}
                onClick={() => setFontScale(key)}
                className={[
                  "rounded-xl border p-2 text-sm",
                  active
                    ? "border-primary-400 ring-2 ring-primary-200"
                    : "border-neutral-200 dark:border-neutral-700",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Reset */}
      <section className="pt-2">
        <button
          onClick={resetAll}
          className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
        >
          <HiRefresh className="text-lg" />
          Restaurar valores por defecto
        </button>
      </section>
    </div>
  );
}
