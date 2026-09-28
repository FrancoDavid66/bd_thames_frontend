// src/components/legales/legalesContext.js
//
// 🔌 Lo que comparten todas las pantallas de Legales (quién es el usuario, el
// catálogo, la lista de abogados y los filtros del tablero). Lo llena
// LegalesPage; los componentes lo leen con useLegales().
import { createContext, useContext } from "react";

export const LegalesCtx = createContext(null);

export function useLegales() {
  return useContext(LegalesCtx) || {};
}
