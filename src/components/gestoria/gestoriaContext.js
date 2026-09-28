// src/components/gestoria/gestoriaContext.js
//
// 🔌 Lo que comparten todas las pantallas de Gestoría (quién es el usuario,
// el catálogo, la lista de gestores y los filtros del tablero). Lo llena
// GestoriaPage; los componentes lo leen con useGestoria().
import { createContext, useContext } from "react";

export const GestoriaCtx = createContext(null);

export function useGestoria() {
  return useContext(GestoriaCtx) || {};
}
