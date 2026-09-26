// src/hooks/useSerieBalance.js
// ============================================================
// 📈 Serie del gráfico de Balances (día por día o mes por mes), sumada en el
// servidor. La usan Balances y el Inicio.
//
// Uso:
//   const serie = useSerieBalance({ agrupar: "mes", desde, hasta, oficina });
//   serie.puntos    → [{ periodo: "2026-08", ingresos: "…", egresos: "…", neto: "…" }, …]
//   serie.agruparDatos → "mes" | "dia" de los puntos que se VEN (al cambiar de
//                     vista, hasta que llega la nueva siguen los anteriores)
//   serie.cargando  → true mientras llega (la primera vez o al cambiar el filtro)
//   serie.recargar({ silencioso: true })  → para las recargas EN VIVO
//
// Si cambiás de filtro rápido (ej: tocás ‹ ‹ ‹ para ir a mayo), solo vale la
// ÚLTIMA respuesta: las viejas que llegan tarde se ignoran.
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { pedirSerie } from "../services/balances";

export default function useSerieBalance({ agrupar = "mes", desde, hasta, oficina, activo = true } = {}) {
  // Arranca en "cargando" si ya se va a pedir (así no parpadea un gráfico vacío).
  const [estado, setEstado] = useState(() => ({ puntos: [], agrupar: null, clave: null, cargando: !!activo, error: null }));
  const pedidoRef = useRef(0);
  const normalesRef = useRef(0); // cargas "normales" (cambio de filtro) en vuelo
  const clave = `${agrupar}|${desde || ""}|${hasta || ""}|${oficina ?? ""}`;

  const recargar = useCallback(
    async ({ silencioso = false } = {}) => {
      if (!activo) return false;
      // En vivo: si justo se está cargando por un cambio de filtro, esa carga ya
      // trae lo último → no la pisamos.
      if (silencioso && normalesRef.current > 0) return false;
      const mio = ++pedidoRef.current;
      if (!silencioso) {
        normalesRef.current += 1;
        setEstado((s) => ({ ...s, cargando: true, error: null }));
      }
      try {
        const data = await pedirSerie({ agrupar, desde, hasta, oficina });
        if (mio !== pedidoRef.current) return false; // llegó tarde: ya se pidió otra cosa
        setEstado({
          puntos: Array.isArray(data?.puntos) ? data.puntos : [],
          agrupar,
          clave,
          cargando: false,
          error: null,
        });
        return true;
      } catch (err) {
        if (mio !== pedidoRef.current) return false;
        console.error("[Balances] Error al cargar el gráfico:", err);
        if (silencioso) {
          // En vivo: si falla, dejamos lo que se ve (sin cartel de error).
          setEstado((s) => ({ ...s, cargando: false }));
        } else {
          // No dejamos a la vista el gráfico del filtro anterior como si fuera el nuevo.
          setEstado({ puntos: [], agrupar: null, clave: null, cargando: false, error: "No se pudo cargar el gráfico." });
        }
        return false;
      } finally {
        if (!silencioso) normalesRef.current -= 1;
      }
    },
    [activo, agrupar, desde, hasta, oficina, clave]
  );

  useEffect(() => {
    if (!activo) {
      // Si había un pedido en vuelo, su respuesta ya no cuenta (y no queda "cargando").
      pedidoRef.current += 1;
      setEstado((s) => (s.cargando ? { ...s, cargando: false } : s));
      return;
    }
    recargar();
  }, [activo, recargar]);

  return {
    puntos: estado.puntos,
    agruparDatos: estado.agrupar,
    cargando: estado.cargando,
    error: estado.error,
    // ¿Lo que se ve es de otro filtro? (ej: todavía muestra julio mientras carga agosto)
    desactualizado: estado.clave !== clave,
    recargar,
  };
}
