// src/components/renovaciones/ErrorBanner.jsx
//
// Banner reusable para mostrar errores estructurados que vienen del backend.
//
// Espera un objeto con este formato:
//   {
//     error: "COBERTURA_NO_CONFIGURADA",
//     message: "Falta configurar la cobertura",
//     detail: "...",
//     action: "Andá a Admin → Catálogos...",
//     context: { compania: "Sancor", cobertura: "A" }
//   }

import { motion } from "framer-motion";
import { HiExclamation, HiX, HiInformationCircle } from "react-icons/hi";

import { cx } from "./utils";

// Severidad según el código de error
function severityFor(code) {
  if (!code) return "error";

  // Warnings (informativos)
  if (
    code === "CUOTAS_IMPAGAS" ||
    code === "FECHA_PASADA" ||
    code === "COMPANIA_CAMBIADA"
  ) {
    return "warning";
  }

  return "error";
}

const STYLES = {
  error: {
    bg: "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)]",
    border: "border-duo-rojo/40",
    icon: "text-duo-rojo",
    title: "text-duo-rojo",
    text: "text-titulo dark:text-titulo-dark",
    action: "text-duo-rojo",
  },
  warning: {
    bg: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)]",
    border: "border-duo-amarillo/40",
    icon: "text-duo-amarillo-sombra dark:text-duo-amarillo",
    title: "text-duo-amarillo-sombra dark:text-duo-amarillo",
    text: "text-titulo dark:text-titulo-dark",
    action: "text-duo-amarillo-sombra dark:text-duo-amarillo",
  },
};

export default function ErrorBanner({ error, onClose, children }) {
  if (!error) return null;

  const code = error.error || error.code || "ERROR_DESCONOCIDO";
  const sev = severityFor(code);
  const s = STYLES[sev];
  const Icon = sev === "warning" ? HiInformationCircle : HiExclamation;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      className={cx(
        "rounded-xl border p-3.5 flex items-start gap-3",
        s.bg,
        s.border
      )}
    >
      <Icon className={cx("text-2xl shrink-0 mt-0.5", s.icon)} />

      <div className="flex-1 min-w-0">
        <div className={cx("text-sm font-semibold mb-0.5", s.title)}>
          {error.message || "Ocurrió un error"}
        </div>

        {error.detail && (
          <div className={cx("text-xs leading-relaxed", s.text)}>
            {error.detail}
          </div>
        )}

        {error.action && (
          <div className={cx("text-xs font-medium mt-1.5 leading-relaxed", s.action)}>
            {error.action}
          </div>
        )}

        {/* Contexto técnico (compañía, cobertura, etc.) en chips */}
        {error.context && Object.keys(error.context).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Object.entries(error.context)
              .filter(([_, v]) => v !== null && v !== undefined && v !== "")
              .map(([k, v]) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 rounded-md bg-surface dark:bg-surface-dark px-2 py-0.5 text-[10px] font-mono text-suave dark:text-suave-dark"
                >
                  <span className="opacity-60">{k}:</span>
                  <span className="font-medium text-titulo dark:text-titulo-dark">{String(v)}</span>
                </span>
              ))}
          </div>
        )}

        {/* Slot para contenido extra: input de override, botones, etc. */}
        {children && <div className="mt-3">{children}</div>}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          title="Cerrar"
        >
          <HiX className={s.icon} />
        </button>
      )}
    </motion.div>
  );
}