// src/components/gestoria/gestora/gestoraContext.js
//
// 🔌 Lo que comparten las pantallas de la app de la gestora (lo llena AppGestora):
//   lista      sus trámites abiertos (los mismos para Inicio, Trámites y Cobros)
//   res        el resumen (su nombre, su perfil, "Hoy: 3 presentados · 1 listo")
//   cargar()   vuelve a pedir las dos cosas (después de cada botón)
//   busqueda   lo que escribió en «Trámites» (queda al volver de un trámite)
//   conPlata   comisiones prendidas: hay pestaña «Cobros» y se piden comprobantes
//   cobros     lo de «Cobros» (mis-cobros/), guardado para cuando se vuelve a la pestaña
//   cargarCobros()  lo vuelve a pedir
import { createContext, useContext } from "react";

export const GestoraCtx = createContext(null);

export function useGestora() {
  return useContext(GestoraCtx) || {};
}
