// src/hooks/useMediaQuery.js
// ============================================================
// 📱 ¿La pantalla cumple esta media query? (se actualiza sola al girar el
// celu o achicar la ventana).
//
// Uso:
//   const esEscritorio = useEsEscritorio();          // compu (≥ 1024 px)
//   const ancho = useMediaQuery("(min-width: 640px)");
//
// Ejemplo fácil: en la compu la barra de abajo se puede esconder; en el celu
// no (es el menú principal), así que el Footer pregunta useEsEscritorio().
// ============================================================
import { useCallback, useSyncExternalStore } from "react";

export default function useMediaQuery(query) {
  const suscribir = useCallback(
    (avisar) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", avisar);
      return () => mql.removeEventListener("change", avisar);
    },
    [query]
  );
  const leer = () =>
    typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(query).matches;
  return useSyncExternalStore(suscribir, leer, () => false);
}

// 🖥️ Compu = lg de Tailwind (64rem = 1024 px o más). Tablet parada y celu: menos.
//    En rem, igual que Tailwind: si alguien agranda la letra del navegador, el
//    JS y el CSS cambian de "celu" a "compu" en el mismo punto.
export function useEsEscritorio() {
  return useMediaQuery("(min-width: 64rem)");
}
