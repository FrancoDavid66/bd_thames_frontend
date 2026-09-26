// src/hooks/usePolizasNuevas.js
// ============================================================
// 🆕 Pólizas nuevas por oficina, con datos EN VIVO.
//
//   const mes = useNuevasMes("2026-09");      // el mes día por día
//   mes.data?.oficinas → [{ id, nombre, nuevas, clientes_nuevos, pagaron, hoy, antes, dias, ultima }]
//   mes.cargando / mes.error / mes.desactualizado / mes.recargar()
//
//   const serie = useNuevasSerie({ desde: "2025-10", hasta: "2026-09" }); // mes a mes
//
// En vivo: cuando alguien carga una póliza o cobra una cuota (temas
// "polizas" y "cuotas" del cartero), se vuelve a pedir en silencio.
// También cuando cambia el día (la compu quedó prendida de un día para otro):
// así "Hoy" y "faltan N días" no quedan viejos.
// Si cambiás de mes rápido (‹ ‹ ‹), vale la ÚLTIMA respuesta: las viejas
// que llegan tarde se ignoran.
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import useDatosVivos from "./useDatosVivos";
import { pedirNuevasMes, pedirNuevasSerie } from "../services/polizasNuevas";
import { hoyArgentina } from "../components/polizasNuevas/comun";

const mensajeDeError = (err) =>
  err?.response?.data?.detail || "No se pudieron cargar las pólizas nuevas.";

function usePedidoVivo(clave, pedir, { activo = true, vivo = true } = {}) {
  // Arranca en "cargando" si ya se va a pedir (así no parpadea un "sin datos").
  const [estado, setEstado] = useState(() => ({ data: null, clave: null, cargando: !!activo, error: null }));
  const pedidoRef = useRef(0);
  const normalesRef = useRef(0); // cargas "normales" (cambio de filtro) en vuelo
  const diaRef = useRef(null); // día (Argentina) de la última carga buena
  const pedirRef = useRef(pedir);
  pedirRef.current = pedir;

  const recargar = useCallback(
    async ({ silencioso = false } = {}) => {
      if (!activo) return false;
      // En vivo: si justo se está cargando por un cambio de filtro, esa carga
      // ya trae lo último → no la pisamos.
      if (silencioso && normalesRef.current > 0) return false;
      const mio = ++pedidoRef.current;
      if (!silencioso) {
        normalesRef.current += 1;
        setEstado((s) => ({ ...s, cargando: true, error: null }));
      }
      try {
        const data = await pedirRef.current();
        if (mio !== pedidoRef.current) return false; // llegó tarde: ya se pidió otra cosa
        diaRef.current = hoyArgentina();
        setEstado({ data, clave, cargando: false, error: null });
        return true;
      } catch (err) {
        if (mio !== pedidoRef.current) return false;
        console.error("[Pólizas nuevas] Error al cargar:", err);
        if (silencioso) {
          // En vivo: si falla, dejamos lo que se ve (sin cartel de error).
          setEstado((s) => ({ ...s, cargando: false }));
        } else {
          // No dejamos a la vista los datos de otro mes como si fueran de este.
          setEstado({ data: null, clave: null, cargando: false, error: mensajeDeError(err) });
        }
        return false;
      } finally {
        if (!silencioso) normalesRef.current -= 1;
      }
    },
    [activo, clave]
  );

  useEffect(() => {
    if (!activo) {
      pedidoRef.current += 1; // si había un pedido en vuelo, su respuesta ya no cuenta
      setEstado((s) => (s.cargando ? { ...s, cargando: false } : s));
      return;
    }
    recargar();
  }, [activo, recargar]);

  // 📡 EN VIVO: póliza nueva o cuota cobrada → se actualiza sola (como mucho cada 15 s).
  useDatosVivos(["polizas", "cuotas"], () => recargar({ silencioso: true }), {
    activo: activo && vivo,
    cadaMs: 15_000,
  });

  // 🌙 Pasó la medianoche → se vuelve a pedir (una vez por minuto se fija).
  useEffect(() => {
    if (!activo || !vivo) return undefined;
    const t = setInterval(() => {
      if (diaRef.current && diaRef.current !== hoyArgentina()) recargar({ silencioso: true });
    }, 60_000);
    return () => clearInterval(t);
  }, [activo, vivo, recargar]);

  return {
    data: estado.data,
    cargando: estado.cargando,
    error: estado.error,
    // ¿Lo que se ve es de otro pedido? (ej: todavía muestra agosto mientras carga septiembre)
    desactualizado: estado.clave !== clave,
    recargar,
  };
}

/** El mes día por día ("AAAA-MM"; vacío = el actual). */
export function useNuevasMes(mes, opciones) {
  return usePedidoVivo(`mes|${mes || ""}`, () => pedirNuevasMes(mes), opciones);
}

/** Mes a mes + ganadora de cada mes (por defecto, los últimos 12). */
export function useNuevasSerie({ desde, hasta } = {}, opciones) {
  return usePedidoVivo(`serie|${desde || ""}|${hasta || ""}`, () => pedirNuevasSerie({ desde, hasta }), opciones);
}
