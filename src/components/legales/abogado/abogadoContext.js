// src/components/legales/abogado/abogadoContext.js
//
// 🔌 Lo que comparten las pantallas de la APP DEL ABOGADO (lo llena AppAbogado):
//   casos      sus casos abiertos (los mismos para Inicio, Casos y Plata)
//   res        el resumen (su perfil, lo que le debe a THAMES, honorarios sin cargar)
//   agenda     { fechas, vencidas, hoy }: lo vencido sin marcar y lo de los próximos 7 días
//   turnos     sus turnos de hoy y de la semana
//   listas     { ESTADO, INSTANCIA, ETIQUETA }: los estados, instancias y etiquetas del estudio
//   cargar()   vuelve a pedir todo (después de cada botón)
//   cargarListas()  vuelve a pedir las listas · setListas(l) las deja como vinieron del servidor
//   busqueda   lo que escribió en «Casos» (queda al volver de un caso)
//   filtro     { estado, instancia, etiqueta, ver } de «Casos»
import { createContext, useContext } from "react";

export const AbogadoCtx = createContext(null);

export function useAbogado() {
  return useContext(AbogadoCtx) || {};
}
