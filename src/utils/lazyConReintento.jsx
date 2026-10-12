// src/utils/lazyConReintento.jsx
// ============================================================
// ⚡ Pantallas que se bajan recién cuando se abren (React.lazy).
//
// Antes la app entera (6,4 MB) se bajaba al entrar, aunque solo abrieras
// Pagos. Ahora cada pantalla viene en su propio pedazo.
//   Ej: entrás al Inicio → baja el Inicio. Tocás Balances → baja Balances.
//
// 🔁 Después de subir una versión nueva (Vercel), los pedazos viejos dejan de
//    existir: si alguien tenía la app abierta y toca otra pantalla, el pedido
//    falla. En ese caso se recarga la página UNA vez (trae la versión nueva).
//    Si vuelve a fallar (ej: sin internet), se muestra un aviso con
//    "Reintentar" en vez de dejar la pantalla en blanco.
// ============================================================
import { lazy } from "react";

const CLAVE = "thames_recarga_por_version";

function SinConexion() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">No se pudo abrir esta pantalla.</p>
      <p className="max-w-sm text-[13px] text-suave dark:text-suave-dark">
        Puede ser internet o que justo se subió una versión nueva de Thames.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="min-h-[44px] rounded-xl bg-duo-violeta px-5 text-[14px] font-semibold text-white active:scale-95"
      >
        Reintentar
      </button>
    </div>
  );
}

export default function lazyConReintento(importar) {
  return lazy(() =>
    importar()
      .then((modulo) => {
        try {
          sessionStorage.removeItem(CLAVE);
        } catch {
          /* sin sessionStorage: no pasa nada */
        }
        return modulo;
      })
      .catch(() => {
        let ultima = 0;
        try {
          ultima = Number(sessionStorage.getItem(CLAVE) || 0);
        } catch {
          /* sin sessionStorage */
        }
        const ahora = Date.now();
        if (ahora - ultima > 30000) {
          try {
            sessionStorage.setItem(CLAVE, String(ahora));
          } catch {
            /* sin sessionStorage */
          }
          window.location.reload();
          return new Promise(() => {}); // queda "Cargando…" hasta que recarga
        }
        return { default: SinConexion };
      })
  );
}

// Lo que se ve mientras baja la pantalla (normalmente una fracción de segundo).
export function CargandoPantalla({ pantallaCompleta = false }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center gap-2 text-[13px] font-medium text-suave dark:text-suave-dark ${
        pantallaCompleta ? "min-h-[100dvh] bg-surface dark:bg-surface-dark" : "min-h-[40vh]"
      }`}
    >
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-linea dark:border-linea-dark border-t-duo-violeta" aria-hidden="true" />
      Cargando…
    </div>
  );
}
